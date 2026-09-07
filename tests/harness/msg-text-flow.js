// Does a message with a link read as a sentence, or as three columns?
//
// A linked message is an Element with markup rather than a Note, because the
// filename has to sit inline in the flowing sentence. ui-core renders Element
// through its `wrapper` kind, which lands on `.box[data-flow]` — a flex ROW —
// and the runs either side of the <span> then become flex ITEMS: three narrow
// columns, each wrapping inside itself, with the <br>s dropped entirely.
//
// The descriptor tests cannot see this and neither can a harness that renders
// the element as a plain <div>, which is what tests/helpers does. So this one
// stamps the container the way ui-core stamps it and measures what comes out.
//
// Run:  node tests/harness/msg-text-flow.js
const { execFileSync } = require("node:child_process");
const { writeFileSync, mkdtempSync } = require("node:fs");
const { join } = require("node:path");
const { tmpdir } = require("node:os");
const ROOT = join(__dirname, "../..");
const { renderModule, toHtml } = require("../helpers/render-skeleton.js");

const CHROME = process.env.CHROME
  || ["chromium", "chromium-browser", "google-chrome"].find((c) => {
    try { execFileSync("which", [c], { stdio: "pipe" }); return true; } catch (e) { return false; }
  });
if (!CHROME) throw new Error("no chromium on PATH; set CHROME=");

const sass = (e) => execFileSync("sass", ["-I", ".", "-I", "skin", "--no-source-map", e],
  { cwd: join(ROOT, "src/drumee"), encoding: "utf8", maxBuffer: 1 << 26 });
let css = "";
for (const e of ["skin/vars/revamp.scss", "router/skin/themes/light.scss",
                 "skin/lib/container.scss", "modules/desk/tutorial/chat/skin/index.scss"]) css += sass(e);

const ui = { fig: { family: "tutorial-chat", group: "tutorial" }, mget: () => null };
let html = toHtml(renderModule("src/drumee/modules/desk/tutorial/chat/skeleton/index.js", ui, {}));
// THE CONTAINER, AS UI-CORE STAMPS IT. Without this the element is a plain
// block and the bug cannot reproduce — which is exactly how it shipped.
html = html.replace(/<div class="tutorial-chat__msg-text"/g,
  '<div class="box tutorial-chat__msg-text" data-flow="x"');

const page = `<!doctype html><meta charset="utf-8">
<style>html,body{margin:0;background:#fff}${css}</style>
<div class="tutorial tutorial-chat tutorial-chat__ui" style="width:1280px;height:900px;display:flex">${html}</div>
<script>
  const t = document.querySelector('.tutorial-chat__msg-text');
  const link = t.querySelector('.tutorial-chat__msg-link');
  const tr = t.getBoundingClientRect(), lr = link.getBoundingClientRect();
  // One rect per LINE BOX over the whole element.
  const range = document.createRange();
  range.selectNodeContents(t);
  const lines = [...range.getClientRects()].filter((r) => r.width > 1);
  document.title = JSON.stringify({
    display: getComputedStyle(t).display,
    box: { w: Math.round(tr.width), h: Math.round(tr.height) },
    linkDx: Math.round(lr.left - tr.left),
    linkDy: Math.round(lr.top - tr.top),
    // ONE RECT PER RUN PER LINE, not per line — the <span> is its own rect, so
    // the linked line yields two. Cluster by top to get the lines back.
    lines: lines
      .map((r) => ({ top: r.top - tr.top, left: r.left - tr.left }))
      .reduce((acc, r) => {
        const at = acc.find((g) => Math.abs(g.top - r.top) <= 3);
        if (at) at.left = Math.min(at.left, r.left);
        else acc.push({ top: r.top, left: r.left });
        return acc;
      }, [])
      .map((g) => ({ top: Math.round(g.top), left: Math.round(g.left) })),
  });
</script>`;
const dir = mkdtempSync(join(tmpdir(), "msgflow-"));
const f = join(dir, "m.html");
writeFileSync(f, page);
const dom = execFileSync(CHROME, ["--headless", "--disable-gpu", "--no-sandbox",
  "--virtual-time-budget=1200", "--window-size=1280,900", "--dump-dom", "file://" + f],
  { encoding: "utf8", maxBuffer: 1 << 26 });
const d = JSON.parse(dom.match(/<title>([\s\S]*?)<\/title>/)[1]
  .replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&#39;/g, "'"));

console.log(`  display ${d.display}   box ${d.box.w}x${d.box.h}`);
console.log(`  link at +${d.linkDx},+${d.linkDy}   lines ${JSON.stringify(d.lines)}`);
const checks = [
  ["the sentence flows, it is not a flex row", d.display === "block"],
  ["three lines", d.lines.length === 3],
  ["every line starts flush left — columns would not", d.lines.every((l) => l.left === 0)],
  ["the link OPENS the second line", d.linkDx === 0 && d.linkDy > 10 && d.linkDy < 25],
  ["the block is three lines tall, not four", d.box.h >= 50 && d.box.h <= 55],
];
for (const [what, ok] of checks) console.log(`  ${ok ? "✓" : "✗"} ${what}`);
