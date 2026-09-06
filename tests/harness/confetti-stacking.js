// Does the tour's confetti actually paint ABOVE the tour?
//
// canvas-confetti appends its own fixed canvas to <body>, so its z-index
// competes at the ROOT against whatever the tour's overlay computes to — and
// that number is not the one written on the overlay. `.desk-module__overlay`
// declares z-index 10010, but skin/lib/utils.scss carries a bare
//
//   [data-state="open"] { z-index: var(--z-index-context) !important }
//
// which matches ANY element with that attribute, the overlay included, and
// lifts it to 50000. The constant used to be 10020, which lost.
//
// This cannot be reasoned about from one file, and it cannot be seen in a
// screenshot either — confetti is transient. elementFromPoint answers it
// directly: whatever is on top is what it returns.
//
// Run:  node tests/harness/confetti-stacking.js
const { execFileSync } = require("node:child_process");
const { writeFileSync, mkdtempSync } = require("node:fs");
const { join } = require("node:path");
const { tmpdir } = require("node:os");

const ROOT = join(__dirname, "../..");
const { Z_INDEX } = require("../../src/drumee/modules/desk/tutorial/confetti.js");

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

// utils.scss is the file that does the lifting, and desk/skin is what it lifts.
// Leaving either out reports a pass that the browser would not give.
let css = "";
for (const entry of [
  "skin/vars/revamp.scss",
  "skin/vars/z-index.scss",
  "router/skin/themes/light.scss",
  "skin/lib/utils.scss",
  "modules/desk/skin/index.scss",
]) {
  css += sass(entry);
}

// The canvas canvas-confetti creates: fixed, full-bleed, pointer-events none.
// `inset: 0` alone does NOT stretch a <canvas> — it is a replaced element and
// keeps its intrinsic 300x150, which reads as "behind the tour" no matter what
// the z-index says. Width and height are what make this fixture honest.
const canvas = (id, z) =>
  `<canvas id="${id}" style="position:fixed;top:0;left:0;width:100%;height:100%;z-index:${z}"></canvas>`;

const page = `<!doctype html><meta charset="utf-8">
<style>html,body{margin:0;height:100%}${css}</style>
<div class="desk-module desk-module__ui" style="position:relative;height:100vh">
  <div class="desk-module__overlay" data-state="open" data-device="desktop">
    <div id="tour" style="position:absolute;inset:0;background:#fff"></div>
  </div>
</div>
${canvas("ours", Z_INDEX)}
${canvas("old", 10020)}
<script>
  const topAt = (keep) => {
    for (const id of ["ours", "old"]) {
      document.getElementById(id).style.display = id === keep ? "" : "none";
    }
    const el = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
    return el ? el.id || el.className : "nothing";
  };
  document.title = JSON.stringify({
    overlayZ: getComputedStyle(document.querySelector(".desk-module__overlay")).zIndex,
    withOurs: topAt("ours"),
    withOld: topAt("old"),
  });
</script>`;

const dir = mkdtempSync(join(tmpdir(), "confetti-z-"));
const file = join(dir, "z.html");
writeFileSync(file, page);
const dom = execFileSync(
  CHROME,
  ["--headless", "--disable-gpu", "--no-sandbox", "--virtual-time-budget=1200",
   "--window-size=1200,800", "--dump-dom", `file://${file}`],
  { encoding: "utf8", maxBuffer: 1 << 26 },
);
const d = JSON.parse(
  dom.match(/<title>([\s\S]*?)<\/title>/)[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&"),
);

console.log(`the overlay declares 10010 and computes to ${d.overlayZ}`);
const ok = d.withOurs === "ours";
console.log(`${ok ? "✓" : "✗"} confetti at ${Z_INDEX} → topmost is "${d.withOurs}"`);
console.log(`  (for contrast, the old 10020 → topmost is "${d.withOld}")`);
process.exitCode = ok ? 0 : 1;
