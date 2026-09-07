// Do the workspace switcher and the account menu open OVER a desk-hosted tour?
//
// Both hang DOWN off the topbar into exactly the area the tour covers, and the
// numbers involved are not the declared ones: the overlay holding the tour is a
// Wrapper, so it carries `data-state="open"`, and skin/lib/utils.scss lifts
// anything with that to --z-index-context (50000) with !important. So a lift to
// "one above 10010" loses silently, which is why this is measured against the
// real cascade with elementFromPoint rather than reasoned about.
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
    </div>
    <!-- A SECOND ROW, and it is the point of this fixture. __topbar is a
         Box.Y and the breadcrumb row and the window tab strip live in it, so
         the bar is often taller than __main's 46. A literal 46px inset
         uncovered the difference and the real desk showed through it.
         (No backticks in here: this page is a template literal.) -->
    <div class="box" data-flow="x" style="height:34px">crumb</div>
    <!-- Both panels, open, as the topbar renders them: absolutely placed and
         hanging down off the bar. -->
    <div id="wsmenu" class="box desk-module-topbar__ws-menu" data-flow="y"
         style="position:absolute;top:46px;left:20px;width:300px;height:320px;background:#fff">menu</div>
    <div id="acct" class="box desk-module-topbar__account-menu" data-flow="y"
         style="position:absolute;top:46px;right:20px;width:280px;height:260px;background:#fff">acct</div>
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
  const box = (id) => { const r = document.getElementById(id).getBoundingClientRect();
    return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }; };
  const at = (x, y) => { const e = document.elementFromPoint(x, y); return e ? e.className : null; };
  const wm = box("wsmenu"), am = box("acct"), t = box("tour");
  document.title = JSON.stringify({
    tour: t,
    overlay: box("overlay") || null,
    // The middle of each panel, and a point on the bar itself.
    onWsMenu: at(wm.x + wm.w / 2, wm.y + wm.h / 2),
    onAcctMenu: at(am.x + am.w / 2, am.y + am.h / 2),
    onChip: at(box("chip").x + 5, box("chip").y + 10),
    // And a point well inside the tour, clear of both panels.
    onTour: at(640, 600),
    barH: bar.offsetHeight,
    // THE ROW UNDER THE BAR. With a literal 46px inset and a taller bar this
    // is the real desk, which is the reported break.
    justBelowBar: at(640, bar.offsetHeight + 2),
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
  console.log(`  tour box  ${d.tour.x},${d.tour.y} ${d.tour.w}x${d.tour.h}`);
  console.log(`  ws-menu   -> ${d.onWsMenu}`);
  console.log(`  account   -> ${d.onAcctMenu}`);
  console.log(`  the chip  -> ${d.onChip}`);
  console.log(`  the tour  -> ${d.onTour}`);
  console.log(`  bar ${d.barH}px, the row under it -> ${d.justBelowBar}`);
  const checks = [
    // The tour sits in the body either way — it always did, because its slot
    // is a child of the body. What the stamp changes is only what paints on
    // top of it.
    ["the tour sits in the body, under the bar", d.tour.y === d.barH],
    ["the switcher panel is on top", hit(d.onWsMenu, "ws-menu")],
    ["the account menu is on top", hit(d.onAcctMenu, "account-menu")],
    ["the bar itself is reachable", hit(d.onChip, "ws-current|topbar")],
    ["and the tour still takes its own clicks", hit(d.onTour, "tutorial-main")],
    // The one that catches a hardcoded inset: with the bar at 80 and the
    // inset at 46, this point is the desk's own body.
    ["no desk showing under the bar", stamped ? hit(d.justBelowBar, "tutorial-main") : true],
  ];
  for (const [what, ok] of checks) console.log(`  ${ok ? "✓" : "✗"} ${what}`);
}
