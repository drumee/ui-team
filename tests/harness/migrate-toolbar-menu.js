// Does the toolbar's + New dropdown actually land under the toolbar's + New?
//
// The menu is positioned against whichever button it is a child of, and the two
// buttons sit in very different places: the hero's is mid-pane with room below,
// the toolbar's is at the top right of a box that CLIPS (`__fp-main` is
// overflow:hidden). A dropdown that is half outside that box, or that the hero
// block paints over, is a menu the user cannot use — and neither shows up in a
// descriptor-tree test, which is why this measures a real layout.
//
// Run:  node tests/harness/migrate-toolbar-menu.js
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
                 "modules/desk/tutorial/migrate/skin/index.scss"]) css += sass(e);

const SKEL = "src/drumee/modules/desk/tutorial/migrate/skeleton/index.js";
const ui = { fig: { family: "tutorial-migrate", group: "tutorial" }, mget: () => null };
const SCREEN = { key: "pane", pane: true, live: true, bare: true, menu: true, live_menu: true };

for (const at of ["toolbar", "hero"]) {
  const stage = toHtml(renderModule(SKEL, ui, SCREEN, { menuOpen: at }));
  const [w, h] = [1440, 900];
  const page = `<!doctype html><meta charset="utf-8">
<style>html,body{margin:0}${css}</style>
<div class="tutorial tutorial__ui tutorial-main tutorial-migrate tutorial-migrate__ui"
     data-size="wide" data-tour="migrate" style="width:${w}px;height:${h}px;display:flex">
  ${stage}
</div>
<script>
  const q = (s) => document.querySelector(s);
  const r = (s) => { const e = q(s); return e ? e.getBoundingClientRect().toJSON() : null; };
  const menu = r('.tutorial__fp-new-menu');
  const own  = r('.tutorial__fp-new-menu').width != null
    ? q('.tutorial__fp-new-menu').parentElement.className : '';
  const btn  = r('.tutorial__fp-new-btn');
  const hero = r('.tutorial__fp-ghost');
  const main = r('.tutorial__fp-main');
  // What is actually on top at the menu's middle, and at its last row.
  const hit = (y) => {
    const e = document.elementFromPoint(menu.left + menu.width / 2, y);
    return e ? e.className : null;
  };
  document.title = JSON.stringify({
    own, menu, btn, hero, main,
    mid: hit(menu.top + menu.height / 2),
    low: hit(menu.bottom - 8),
  });
</script>`;
  const dir = mkdtempSync(join(tmpdir(), "tbmenu-"));
  const f = join(dir, "m.html");
  writeFileSync(f, page);
  const dom = execFileSync(CHROME, ["--headless", "--disable-gpu", "--no-sandbox",
    "--virtual-time-budget=1200", `--window-size=${w},${h}`, "--dump-dom", "file://" + f],
    { encoding: "utf8", maxBuffer: 1 << 26 });
  const d = JSON.parse(dom.match(/<title>([\s\S]*?)<\/title>/)[1]
    .replace(/&quot;/g, '"').replace(/&amp;/g, "&"));

  const anchor = at === "toolbar" ? d.btn : d.hero;
  const near = (a, b, tol = 1.5) => Math.abs(a - b) <= tol;
  const checks = [
    ["hangs off the right button", d.own.includes(at === "toolbar" ? "fp-new-btn" : "fp-ghost")],
    ["left edges align", near(d.menu.left, anchor.left)],
    ["4px under the button", near(d.menu.top, anchor.bottom + 4)],
    ["has a box at all", d.menu.width > 100 && d.menu.height > 100],
    ["inside the pane, horizontally", d.menu.right <= d.main.right],
    ["inside the pane, vertically", d.menu.bottom <= d.main.bottom],
    ["nothing paints over its middle", /fp-new-(menu|item)/.test(d.mid || "")],
    ["nor over its last row", /fp-new-(menu|item)/.test(d.low || "")],
  ];
  console.log(`\n${at}  menu ${Math.round(d.menu.width)}x${Math.round(d.menu.height)}`
    + ` at ${Math.round(d.menu.left)},${Math.round(d.menu.top)}`
    + `  button bottom ${Math.round(anchor.bottom)}  pane right ${Math.round(d.main.right)}`);
  for (const [what, ok] of checks) console.log(`  ${ok ? "✓" : "✗"} ${what}`);
  console.log(`  top-most: middle=${d.mid} | low=${d.low}`);
}
