// Is the curtain actually centred, and does it actually cover the pane?
//
// Neither is visible in a descriptor tree: centring is `justify-content` on a
// column that has to be told its height, and the cover is a `display:none` slot
// that only the desk root's `data-window-tour` stamp opens. A test that renders
// the skeleton alone would pass with both broken.
//
// Run:  node tests/harness/tour-intro-layout.js
const { execFileSync } = require("node:child_process");
const { writeFileSync, mkdtempSync } = require("node:fs");
const { join } = require("node:path");
const { tmpdir } = require("node:os");

const ROOT = join(__dirname, "../..");
const { renderModule, toHtml } = require("../helpers/render-skeleton.js");

const CHROME =
  process.env.CHROME ||
  ["chromium", "chromium-browser", "google-chrome"].find((c) => {
    try {
      execFileSync("which", [c], { stdio: "pipe" });
      return true;
    } catch (e) {
      return false;
    }
  });
if (!CHROME) throw new Error("no chromium on PATH; set CHROME=");

const sass = (entry) =>
  execFileSync("sass", ["-I", ".", "-I", "skin", "--no-source-map", entry], {
    cwd: join(ROOT, "src/drumee"),
    encoding: "utf8",
    maxBuffer: 1 << 26,
  });

// The theme tokens are in router/skin/themes, NOT skin/vars — leaving them out
// reports every token colour as transparent and every token radius as 0.
let css = "";
for (const entry of [
  "skin/vars/revamp.scss",
  "router/skin/themes/light.scss",
  "skin/lib/container.scss",
  "modules/desk/skin/index.scss",
  "modules/desk/tour-intro/skin/index.scss",
]) {
  css += sass(entry);
}

const ui = { fig: { family: "desk-tour-intro" }, mget: () => null };
const screen = toHtml(renderModule("src/drumee/modules/desk/tour-intro/skeleton/index.js", ui));

for (const [w, h, label] of [[1440, 900, "wide"], [900, 700, "narrow"], [650, 700, "small"]]) {
  const page = `<!doctype html><meta charset="utf-8">
<style>html,body{margin:0;height:100%}${css}</style>
<div class="desk-module desk-module__ui" data-window-tour="1"
     style="position:relative;width:${w}px;height:${h}px">
  <div class="desk-module__wm-container" style="position:relative;width:100%;height:100%">
    <div id="pane" style="position:absolute;inset:0;background:#c00">the pane underneath</div>
    <div class="box desk-module__tour-intro-slot" data-flow="y">
      <div class="desk-tour-intro desk-tour-intro__ui">${screen}</div>
    </div>
  </div>
</div>
<script>
  // Two functions, because they take different things: box() measures an
  // ELEMENT and r() looks one up by selector. Collapsing them and calling
  // .map(r) over a NodeList hands querySelector an element, which throws.
  const box = (el) => {
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { x: Math.round(b.left), y: Math.round(b.top),
             w: Math.round(b.width), h: Math.round(b.height),
             cx: Math.round(b.left + b.width / 2), cy: Math.round(b.top + b.height / 2) };
  };
  const r = (s) => box(document.querySelector(s));
  const host = r('.desk-module__wm-container');
  const main = r('.desk-tour-intro__main');
  const logo = r('.desk-tour-intro__logo');
  const lines = [...document.querySelectorAll('.desk-tour-intro__line')].map(box);
  const line = lines[0];
  // The CONTENT box: the logo's top to the last line's bottom. __main is
  // min-height:100% with justify-content:center, so its own centre is the
  // host's by construction and proves nothing — what has to be centred is
  // what is drawn inside it. (No backticks in here: this comment lives inside
  // a template literal, and one would end the string.)
  const content = { top: logo.y, bottom: lines[lines.length - 1].y + lines[lines.length - 1].h };
  content.cy = Math.round((content.top + content.bottom) / 2);
  const cs = getComputedStyle(document.querySelector('.desk-tour-intro__line'));
  document.title = JSON.stringify({
    host, main, logo, line, content,
    lineSize: cs.fontSize,
    // 4:1 is the symbol's own viewBox (160x40). It is xMidYMid meet, so a
    // wrong box letterboxes rather than distorting — invisible in a screenshot
    // and invisible in a descriptor tree, which is why it is measured.
    logoRatio: Math.round((logo.w / logo.h) * 100) / 100,
    // Does the curtain actually hide the pane? Ask the browser, not the CSS.
    topmost: (() => {
      const el = document.elementFromPoint(host.cx, host.cy);
      return el ? (el.id || el.className) : 'nothing';
    })(),
  });
</script>`;
  const dir = mkdtempSync(join(tmpdir(), "tour-intro-"));
  const file = join(dir, "t.html");
  writeFileSync(file, page);
  const dom = execFileSync(
    CHROME,
    ["--headless", "--disable-gpu", "--no-sandbox", "--virtual-time-budget=1200",
     `--window-size=${w},${h}`, "--dump-dom", `file://${file}`],
    { encoding: "utf8", maxBuffer: 1 << 26 },
  );
  const d = JSON.parse(
    dom.match(/<title>([\s\S]*?)<\/title>/)[1]
      .replace(/&quot;/g, '"').replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<").replace(/&gt;/g, ">"),
  );

  // Centred means the content's centre sits on the host's, within a pixel of
  // rounding — not merely that some `align-items: center` is present.
  const dx = Math.abs(d.main.cx - d.host.cx);
  const dy = Math.abs(d.content.cy - d.host.cy);
  const covers = d.topmost !== "pane";
  const ratioOk = Math.abs(d.logoRatio - 4) < 0.01;
  const ok = dx <= 1 && dy <= 2 && covers && ratioOk;
  console.log(
    `${ok ? "✓" : "✗"} ${label.padEnd(7)} ${w}x${h}  ` +
    `off-centre x${dx} y${Math.round(dy)}  line ${d.lineSize}  ` +
    `logo ${d.logo.w}x${d.logo.h} (${d.logoRatio}:1${ratioOk ? "" : " ✗ not 4:1"})  ` +
    `over the pane: ${covers ? "yes" : "NO — " + d.topmost}`,
  );
}
