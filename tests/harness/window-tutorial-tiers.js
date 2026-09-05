// Does the overlay's own box drive the tier, and does --pane-fit reach the
// step's pane?
//
// The arithmetic is unit-tested (tests/tutorial-host-kit.test.js). What needs a
// layout engine is the part that cannot be asserted on a descriptor tree: the
// tier attribute is stamped on the host root, the rules that read it are
// descendant selectors in a skin file, and the scale they apply is on a
// `.tutorial-main__content > .tutorial__ui` child combinator. Any one of those
// can be right in isolation and wrong together.
//
// Run:  node tests/harness/window-tutorial-tiers.js
//
// It prints one row per width. Read them against the table in the brief.
const { execFileSync } = require("node:child_process");
const { writeFileSync, mkdtempSync } = require("node:fs");
const { join } = require("node:path");
const { tmpdir } = require("node:os");

const { renderModule, toHtml } = require("../helpers/render-skeleton.js");
const { tierFor } = require("../../src/drumee/modules/desk/tutorial/host-kit.js");

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

const ui = { fig: { family: "window-tutorial", group: "window" }, mget: () => null };
const shell = toHtml(renderModule("src/drumee/builtins/window/tutorial/skeleton/index.js", ui));

// Compile the two skins that decide this: the tutorial skin owns the tiers and
// --pane-fit, the new one owns the overlay root.
//
// `--stdin-importer-disable` does not exist on this machine's dart-sass
// (1.93.2) — only `--stdin`/`--no-stdin` do. Rather than probe for a flag that
// isn't there at all, just compile without it; nothing here reads stdin.
function sass(entry) {
  return execFileSync(
    "sass",
    ["-I", ".", "-I", "skin", "--no-source-map", entry],
    { cwd: join(__dirname, "../../src/drumee"), encoding: "utf8" },
  );
}
let css = "";
for (const entry of [
  "modules/desk/tutorial/skin/index.scss",
  "builtins/window/tutorial/skin/index.scss",
]) {
  css += sass(entry);
}

const dir = mkdtempSync(join(tmpdir(), "wt-tiers-"));

// A stand-in for a step's pane: the `.tutorial__ui` child the scale rule
// targets, so --pane-fit can be observed doing something.
const PANE = '<div class="tutorial tutorial__ui" style="width:985px;height:600px"></div>';

for (const [w, h] of [[1440, 900], [1200, 900], [900, 900], [700, 900], [1440, 640]]) {
  const { size, short } = tierFor(w, h);
  const page = `<!doctype html><meta charset="utf-8">
<style>html,body{margin:0}${css}</style>
<div class="window-tutorial window-tutorial__ui tutorial-main"
     data-size="${size}" data-short="${short}" data-tour="share"
     style="position:relative;width:${w}px;height:${h}px">
  ${shell.replace(
    '<div class="window-tutorial__content tutorial-main__content">',
    `<div class="window-tutorial__content tutorial-main__content">${PANE}`,
  )}
</div>
<script>
  const root = document.querySelector('.window-tutorial');
  const pane = document.querySelector('.tutorial__ui');
  const out = {
    box: root.getBoundingClientRect().width + 'x' + root.getBoundingClientRect().height,
    size: root.dataset.size,
    short: root.dataset.short,
    paneFit: getComputedStyle(root).getPropertyValue('--pane-fit').trim() || '(unset)',
    paneTransform: getComputedStyle(pane).transform,
    paneWidth: Math.round(pane.getBoundingClientRect().width),
  };
  document.title = JSON.stringify(out);
</script>`;
  const file = join(dir, `t-${w}x${h}.html`);
  writeFileSync(file, page);
  const dom = execFileSync(
    CHROME,
    [
      "--headless",
      "--disable-gpu",
      "--no-sandbox",
      "--virtual-time-budget=1500",
      `--window-size=${w},${h}`,
      "--dump-dom",
      `file://${file}`,
    ],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );
  const m = dom.match(/<title>([\s\S]*?)<\/title>/);
  console.log(`${w}x${h}`.padEnd(10), m ? m[1] : "(no title — script did not run)");
}
console.log("\nartifacts:", dir);
