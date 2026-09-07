// Is the real topbar drawn at all while a desk-hosted tour is up?
//
// It is not. The tour is a full-screen walkthrough of a mock desk, and the bar
// belongs to the desk underneath it — so `[data-desk-tour]` sets
// `display: none` on it.
//
// TWO EARLIER ANSWERS TO THE SAME AREA are recorded here because the fixture
// had to be rebuilt for each, and the rebuilds are the lesson:
//
//   1. The bar's menus were painted UNDER the tour, so the bar was lifted to
//      100002. The numbers are not the declared ones — an open Wrapper carries
//      `data-state="open"` and utils.scss lifts that to --z-index-context
//      (50000), so a lift to 10011 loses silently.
//   2. Then the bar had to stop answering clicks, so `__main` took
//      `pointer-events: none`. That reached the two menus because both are
//      built INSIDE `__main`.
//
// Both are moot now: a bar that is not rendered needs neither. What this
// harness measures is that nothing of it is left — no box, no paint, no hit —
// and that the tour takes the strip it vacates.
//
// Run:  node tests/harness/desk-tour-topbar.js
const { execFileSync } = require("node:child_process");
const { writeFileSync, mkdtempSync } = require("node:fs");
const { join } = require("node:path");
const { tmpdir } = require("node:os");
const ROOT = join(__dirname, "../..");

const CHROME = process.env.CHROME
  || ["chromium", "chromium-browser", "google-chrome"].find((c) => {
    try { execFileSync("which", [c], { stdio: "pipe" }); return true; } catch (e) { return false; }
  });
if (!CHROME) throw new Error("no chromium on PATH; set CHROME=");

const sass = (e) => execFileSync("sass", ["-I", ".", "-I", "skin", "--no-source-map", e],
  { cwd: join(ROOT, "src/drumee"), encoding: "utf8", maxBuffer: 1 << 26 });
let css = "";
// z-index.scss IS NOT OPTIONAL HERE. It defines --z-index-context, and the
// whole reason these numbers are what they are is the `[data-state="open"] {
// z-index: var(--z-index-context) !important }` in utils.scss. Without the
// token that declaration is invalid and dropped, the overlay stays at its
// declared 10010, and the harness quietly stops reproducing the fault.
for (const e of ["skin/vars/revamp.scss", "skin/vars/z-index.scss",
                 "router/skin/themes/light.scss",
                 "skin/lib/container.scss", "skin/lib/utils.scss",
                 "modules/desk/skin/index.scss", "modules/desk/skin/topbar.scss",
                 "modules/desk/tutorial/skin/index.scss"]) css += sass(e);

// The desk as the tour finds it: topbar in flow, then the body, with the tour
// in the overlay slot beside them. `data-state="open"` is what the Wrapper
// stamps on receiving the tour, and it is the whole reason for the numbers.
const page = (stamped) => `<!doctype html><meta charset="utf-8">
<style>html,body{margin:0}${css}
 /* A FLEX column, as ui-core renders it (.box[data-flow=y] in
    skin/lib/container.scss). It matters: an absolutely positioned child of a
    FLEX container takes its static position from the container's content-box
    origin, so the overlay starts at 0,0 and covers the bar. As a plain block
    it lands after the bar in flow and the bug does not reproduce. No
    backticks in here -- this whole page is a template literal. */
 .desk-module{position:relative;width:1280px;height:800px}
</style>
<div class="box desk-module desk-module__ui"${stamped ? ' data-desk-tour="1"' : ""} data-flow="y">
  <div class="box desk-module__topbar" data-flow="y">
    <div class="box desk-module-topbar__main" data-flow="x">
      <div id="chip" class="box desk-module-topbar__ws-current" data-flow="x">ws</div>
    <!-- BOTH PANELS LIVE INSIDE __main, which is what makes the inert rule
         reach them: desk/skeleton/topbar.js builds the switcher from the left
         cluster and the account menu from the utility cluster, both children
         of __main. Built as siblings, this fixture would have said the bar was
         inert while the menus still answered. -->
    <div id="wsmenu" class="box desk-module-topbar__ws-menu" data-flow="y"
         style="position:absolute;top:46px;left:20px;width:300px;height:320px;background:#fff">menu</div>
    <div id="acct" class="box desk-module-topbar__account-menu" data-flow="y"
         style="position:absolute;top:46px;right:20px;width:280px;height:260px;background:#fff">acct</div>
    </div>
    <!-- A SECOND ROW, and it is the point of this fixture. __topbar is a
         Box.Y and the breadcrumb row and the window tab strip live in it, so
         the bar is often taller than __main's 46. A literal 46px inset
         uncovered the difference and the real desk showed through it.
         (No backticks in here: this page is a template literal.) -->
    <div class="box" data-flow="x" style="height:34px">crumb</div>
  </div>
  <!-- THE OVERLAY IS A CHILD OF __body, and getting that wrong is what made
       this fixture agree with two broken fixes in a row. desk/skeleton/index.js
       pushes the overlay slot onto bodyKids, so the tour is confined to the
       body from the start and never covered the bar. Built as a SIBLING of the
       bar, the tour appeared to cover it, an inset looked necessary, and the
       inset is what uncovered the real desk on screen.
       #real is a marker for that desk: any of it that shows is a bug. -->
  <div class="box desk-module__body" data-flow="x" style="flex:1;position:relative">
    <div id="real" style="position:absolute;inset:0;background:#ff0000"></div>
    <div class="box desk-module__overlay" data-state="open" data-flow="y" style="opacity:1">
      <div id="tour" class="tutorial-main tutorial-main__ui">
        <div class="box tutorial-main__layout" data-flow="y" style="height:100%">
          <div class="box tutorial-main__body" data-flow="x" style="flex:1"></div>
        </div>
      </div>
    </div>
  </div>
</div>
<script>
  const bar = document.querySelector(".desk-module__topbar");
  const box = (id) => { const e = document.getElementById(id); if (!e) return null;
    const r = e.getBoundingClientRect();
    return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }; };
  const at = (x, y) => { const e = document.elementFromPoint(x, y); return e ? e.className : null; };
  const cs = getComputedStyle(bar);
  const t = box("tour");
  document.title = JSON.stringify({
    tour: t,
    barDisplay: cs.display,
    // A display:none box has no geometry at all.
    barH: bar.offsetHeight,
    // Whatever is at the very top-left of the desk, where the bar used to be.
    atTopLeft: at(40, 10),
    // And well inside the tour.
    onTour: at(640, 400),
    // The two menus the earlier rounds were about: gone with their parent.
    menus: [!!document.getElementById("wsmenu"), !!document.getElementById("acct")]
      .join(",") + " present, offsetHeight "
      + [document.getElementById("wsmenu").offsetHeight,
         document.getElementById("acct").offsetHeight].join("/"),
  });
</script>`.replace('box("overlay") || null', 'box("tour")');

for (const stamped of [false, true]) {
  const dir = mkdtempSync(join(tmpdir(), "desktour-"));
  const f = join(dir, "d.html");
  writeFileSync(f, page(stamped));
  const dom = execFileSync(CHROME, ["--headless", "--disable-gpu", "--no-sandbox",
    "--virtual-time-budget=1200", "--window-size=1280,800", "--dump-dom", "file://" + f],
    { encoding: "utf8", maxBuffer: 1 << 26 });
  const d = JSON.parse(dom.match(/<title>([\s\S]*?)<\/title>/)[1]
    .replace(/&quot;/g, '"').replace(/&amp;/g, "&"));

  const hit = (s, want) => new RegExp(want).test(s || "");
  console.log(`\n${stamped ? "WITH" : "WITHOUT"} data-desk-tour`);
  console.log(`  tour box   ${d.tour.x},${d.tour.y} ${d.tour.w}x${d.tour.h}`);
  console.log(`  bar        display:${d.barDisplay}  offsetHeight:${d.barH}`);
  console.log(`  top-left   -> ${d.atTopLeft}`);
  console.log(`  the tour   -> ${d.onTour}`);
  console.log(`  menus      ${d.menus}`);
  const checks = [
    stamped
      ? ["the bar is not drawn", d.barDisplay === "none"]
      : ["the bar is drawn", d.barDisplay !== "none"],
    stamped
      ? ["it occupies no space", d.barH === 0]
      : ["it occupies its strip", d.barH > 0],
    // The strip it vacates goes to __body, where the tour's own slot lives.
    stamped
      ? ["the tour takes the whole height", d.tour.y === 0]
      : ["the tour starts below the bar", d.tour.y > 0],
    stamped
      ? ["nothing of the bar answers at the top-left", !hit(d.atTopLeft, "topbar")]
      : ["the bar answers there before the tour", hit(d.atTopLeft, "topbar")],
    ["the tour still takes its own clicks", hit(d.onTour, "tutorial-main")],
    // Both menus go with their parent — they are built inside __main.
    stamped
      ? ["and both menus are gone with it", /offsetHeight 0\/0/.test(d.menus)]
      : ["the menus have boxes before the tour", !/offsetHeight 0\/0/.test(d.menus)],
  ];
  for (const [what, ok] of checks) console.log(`  ${ok ? "✓" : "✗"} ${what}`);
}
