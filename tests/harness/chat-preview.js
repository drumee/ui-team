// The chat tour's opening plate, measured.
//
// It replaced a bitmap with a composed miniature, and the two failure modes a
// descriptor test cannot see are both about SIZE: the scaled window has no
// height of its own (`__pv-scale` is `flex: 0 0 auto` and the app inside it is
// `flex: 1 1 auto`), and the chat pane's stream is a flex child that collapses
// to nothing in an auto-height parent. Either one renders a plate with a
// topbar and a sliver.
//
// Run:  node tests/harness/chat-preview.js
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
                 "skin/lib/container.scss", "modules/desk/tutorial/skin/index.scss",
                 "modules/desk/tutorial/chat/skin/index.scss"]) css += sass(e);

const ui = { fig: { family: "tutorial-chat", group: "tutorial" }, mget: () => null };
const stage = toHtml(renderModule("src/drumee/modules/desk/tutorial/chat/skeleton/index.js", ui, { empty: 1 }));

const [w, h] = [1440, 900];
const page = `<!doctype html><meta charset="utf-8">
<style>html,body{margin:0}${css}</style>
<div class="tutorial tutorial__ui tutorial-main tutorial-chat tutorial-chat__ui"
     data-size="wide" data-tour="chat" style="width:${w}px;height:${h}px;display:flex">
  ${stage}
</div>
<script>
  const r = (s) => { const e = document.querySelector(s); return e ? e.getBoundingClientRect().toJSON() : null; };
  const n = (s) => document.querySelectorAll(s).length;
  document.title = JSON.stringify({
    art:    r('.tutorial__es-card-art'),
    plate:  r('.tutorial__pv-plate'),
    view:   r('.tutorial__pv-viewport'),
    scale:  r('.tutorial__pv-scale'),
    topbar: r('.tutorial__pv-topbar'),
    app:    r('.tutorial__pv-app'),
    pane:   r('.tutorial-chat__pane'),
    stream: r('.tutorial-chat__stream'),
    railTabs: n('.tutorial__pv-rail-item'),
    lit:    (document.querySelector('.tutorial__pv-rail-item[data-active="1"] .tutorial__pv-rail-text') || {}).textContent,
    msgs:   n('.tutorial-chat__bubble'),
    parts:  n('[data-pn]'),
    img:    n('.tutorial__es-card-img'),
  });
</script>`;
const dir = mkdtempSync(join(tmpdir(), "chatpv-"));
const f = join(dir, "c.html");
writeFileSync(f, page);
const dom = execFileSync(CHROME, ["--headless", "--disable-gpu", "--no-sandbox",
  "--virtual-time-budget=1500", `--window-size=${w},${h}`, "--dump-dom", "file://" + f],
  { encoding: "utf8", maxBuffer: 1 << 26 });
// A picture too, for the eye — the numbers cannot say whether it READS as a
// workspace. `SHOT=<path> node tests/harness/chat-preview.js`
if (process.env.SHOT) {
  execFileSync(CHROME, ["--headless", "--disable-gpu", "--no-sandbox",
    "--virtual-time-budget=1500", `--window-size=${w},${h}`,
    `--screenshot=${process.env.SHOT}`, "file://" + f], { stdio: "pipe" });
  console.log(`  shot: ${process.env.SHOT}`);
}
const d = JSON.parse(dom.match(/<title>([\s\S]*?)<\/title>/)[1]
  .replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&#39;/g, "'"));

const box = (b) => (b ? `${Math.round(b.width)}x${Math.round(b.height)} @${Math.round(b.left)},${Math.round(b.top)}` : "MISSING");
for (const k of ["art", "plate", "view", "scale", "topbar", "app", "pane", "stream"]) {
  console.log(`  ${k.padEnd(7)} ${box(d[k])}`);
}
console.log(`  rail ${d.railTabs} tabs, lit: ${d.lit}   messages: ${d.msgs}   img tags: ${d.img}`);

// 0.62 of 1280 is 793.6 — wider than the card, which is the intended crop.
const checks = [
  ["the plate fills the card", d.plate && Math.round(d.plate.width) === Math.round(d.art.width)
    && Math.round(d.plate.height) === Math.round(d.art.height)],
  ["no <img> left", d.img === 0],
  ["Chat is the lit tab", /chat/i.test(d.lit || "")],
  // getBoundingClientRect returns the TRANSFORMED box, so the app's 1280 comes
  // back as 1280 x 0.62. Checking for 1280 here is checking that the scale did
  // not apply.
  ["the window is composed at app width", d.scale && Math.abs(d.scale.width - 1280 * 0.62) < 2],
  ["and is cropped by the plate", d.scale && d.scale.width > d.view.width],
  ["the pane got a real height", d.pane && d.pane.height > 300],
  ["the stream got one too", d.stream && d.stream.height > 200],
  ["six messages, file message held back", d.msgs === 6],
  ["the plate reaches the card's bottom", d.view && d.view.bottom >= d.art.bottom - 1],
];
for (const [what, ok] of checks) console.log(`  ${ok ? "✓" : "✗"} ${what}`);
