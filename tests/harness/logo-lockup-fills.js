// What each path of the drumee lockup's fill COMPUTES to.
//
// THE BUG THIS EXISTS FOR: the exported lockup carries `fill="none"` on its
// <svg> root and one path with NO fill attribute, which inherits it and paints
// nothing. The sprite build drops that root attribute — so inside the symbol
// that path fell back to SVG's initial value, black, and painted a black shape
// exactly over the purple mark it sits on top of. The icon was not purple, and
// nothing you would grep for had changed: the attribute was still absent, which
// is what "correct" looks like in the source.
//
// Fixed by making that path's `fill="none"` explicit rather than inherited.
//
// NOTE ON WHAT THIS CAN AND CANNOT SEE. It measures the <symbol> TEMPLATE, so
// the six `currentColor` letters compute to black here whatever the page does —
// currentColor resolves per <use> INSTANCE, and the template is not inside the
// styled box. What this file is for is the two fills that do NOT depend on the
// instance: the mark's #433CC5 and the fill-less path's `none`.
//
// NOTHING DRAWS THIS LOCKUP ANY MORE. The tour-intro curtain was the only
// screen that used it and it is gone; the symbol is still in the sprite, so
// this stays as the guard on it for whoever reaches for it next.
//
// Run:  node tests/harness/logo-lockup-fills.js
const { execFileSync } = require("node:child_process");
const { writeFileSync, readFileSync, mkdtempSync } = require("node:fs");
const { join } = require("node:path");
const { tmpdir } = require("node:os");
const ROOT = require("node:path").join(__dirname, "../..");
const CHROME = process.env.CHROME
  || ["chromium","chromium-browser","google-chrome"].find((c) => {
    try { execFileSync("which",[c],{stdio:"pipe"}); return true; } catch(e){ return false; }
  });
if (!CHROME) throw new Error("no chromium on PATH; set CHROME=");
const sprite = readFileSync(join(ROOT, "icons/sprites/raw.sprite.svg"), "utf8");

for (const [color, label] of [["#0B0A21", "template"]]) {
  const page = `<!doctype html><meta charset="utf-8">
<style>html,body{margin:0;background:#fff}
 .logo{width:302px;height:60px;color:${color}}
 .logo svg{width:100%;height:100%}</style>
<div style="position:absolute;width:0;height:0;overflow:hidden">${sprite}</div>
<div class="logo"><svg viewBox="0 0 120.723 24"><use xlink:href="#--icon-raw-logo-drumee-lockup"></use></svg></div>
<script>
  const sym = document.getElementById('--icon-raw-logo-drumee-lockup');
  const rows = [...sym.querySelectorAll('path')].map((p) => {
    const b = p.getBBox();
    return { attr: p.getAttribute('fill'),
             computed: getComputedStyle(p).fill,
             x: Math.round(b.x), w: Math.round(b.width) };
  });
  document.title = JSON.stringify(rows);
</script>`;
  const dir = mkdtempSync(join(tmpdir(),"cmp-")); const f = join(dir,"c.html");
  writeFileSync(f, page);
  const dom = execFileSync(CHROME,["--headless","--disable-gpu","--no-sandbox",
    "--virtual-time-budget=1500","--window-size=800,400","--dump-dom","file://"+f],
    { encoding:"utf8", maxBuffer:1<<26 });
  const rows = JSON.parse(dom.match(/<title>([\s\S]*?)<\/title>/)[1]
    .replace(/&quot;/g,'"').replace(/&amp;/g,"&"));
  const mark = rows.find((r) => r.attr === "#433CC5");
  const blank = rows.find((r) => r.attr === "none");
  const letters = rows.filter((r) => r.attr === "currentColor");
  const ok = mark && mark.computed === "rgb(67, 60, 197)"
    && blank && blank.computed === "none"
    && letters.length === 6;
  console.log(`${ok ? "✓" : "✗"} mark ${mark ? mark.computed : "MISSING"}` +
    `   over-path ${blank ? blank.computed : "MISSING"}` +
    `   letters ${letters.length}/6 on currentColor`);
  if (!ok) process.exitCode = 1;
}
