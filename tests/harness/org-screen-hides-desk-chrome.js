// What desk chrome is drawn while the organisation screen is up?
//
// Two things must not be: the org dropdown's "Open" pill (it leads where the
// user already is) and the sidebar's __nav-main — the five workspace rail items,
// which drive the ACTIVE WORKSPACE WINDOW rather than this screen.
//
// AND THREE THINGS MUST SURVIVE, which is most of what this harness is for. The
// rail's own parent __nav carries the LOGO ROW above it (wordmark, org name,
// collapse/pin toggle) and the __footer sits beside it; an earlier revision hid
// __nav and took the logo with it. Measuring only the thing that should
// disappear cannot tell "hide the rail" from "hide the sidebar".
//
// The rule is a `:has()` from the desk root, the one ancestor the topbar chip,
// the sidebar and the settings slot all share, so this harness needs the REAL
// nesting of all three to mean anything: a fixture with them side by side would
// pass whatever the selector said.
//
// Three states, because the rule has to be exact in all of them:
//
//   no screen      the org view is not mounted     -> pill drawn
//   screen up      __main inside a live root       -> pill hidden
//   screen parked  root stamped data-anim="out"    -> pill drawn
//
// The third is not hypothetical-only: desk_org_view is destroyed on close
// today, but a screen that joins KEEP_ALIVE_MAIN_KINDS is parked in the DOM
// instead, and a rule keyed on presence alone would hide this pill for the rest
// of the session.
//
// Run:  node tests/harness/org-tab-open-pill-visibility.js
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
const css = [
  sass("skin/vars/index.scss"),
  sass("skin/lib/container.scss"),
  sass("modules/desk/org-tab/skin/index.scss"),
  sass("modules/desk/skin/index.scss"),
  sass("modules/desk/skin/sidebar.scss"),
].join("\n");

// The REAL panel, so the pill is the one the skeleton draws (and so this fails
// if `can_browse` ever stops producing it).
const { installGlobals, installResolver, toHtml } = require("../helpers/render-skeleton.js");
const restoreG = installGlobals();
const restoreR = installResolver();
let panelHtml;
try {
  const p = require.resolve(join(ROOT, "src/drumee/modules/desk/org-tab/skeleton/index.js"));
  delete require.cache[p];
  const skl = require(p);
  panelHtml = toHtml(skl.panel("desk-org-tab", { fig: { family: "desk-org-tab" }, mget: () => null }, {
    organisation: { name: "Acme Corporation", department_count: 3, member_count: 24 },
    role: "owner", departments: [], workspaces: [], can_manage: 1, can_browse: 1,
  }));
} finally { restoreR(); restoreG(); }

// .desk-module > (topbar > left-cluster > the chip's menu) + (right side >
// settings-main-slot > the org screen). Cut down to the two branches the rule
// names, but with the ancestors that make it resolve.
//
// `screen` is "", "live" or "parked".
const desk = (id, screen) => `
<div class="box desk-module desk-module__ui" data-flow="x" id="${id}">
  <div class="box desk-module-sidebar desk-module-sidebar__rail" data-flow="y"
       data-collapsed="0">
    <div class="box desk-module-sidebar__main" data-flow="y">
      <div class="box desk-module-sidebar__nav" data-flow="y">
        <div class="box desk-module-sidebar__logo-row" data-flow="x">logo</div>
        <div class="box desk-module-sidebar__nav-main" data-flow="y">
          <div class="box desk-module-sidebar__item" data-flow="x">Files</div>
        </div>
      </div>
      <div class="box desk-module-sidebar__footer" data-flow="y">footer</div>
    </div>
  </div>
  <div class="box desk-module__topbar" data-flow="x">
    <div class="box desk-module-topbar__left-cluster" data-flow="x">
      <div class="box menu-topic menu-topic__ui desk-org-tab__wrapper" data-flow="x"
           data-state="1">
        <div class="box menu-topic-items__wrapper" data-flow="y" data-state="open"
             style="position:absolute;overflow:hidden">
          <div class="box menu-topic-items menu-items" data-flow="y">
            <div class="box desk-org-tab__items" data-flow="y">${panelHtml}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="box desk-module__right-side" data-flow="y">
    <div class="box desk-module__settings-main-slot" data-flow="y">
      ${screen
    ? `<div class="box desk desk-org-view desk-org-view__ui" data-flow="y"
              ${screen === "parked" ? 'data-anim="out"' : ""}>
             <div class="box desk-org-view__main" data-flow="y">screen</div>
           </div>`
    : ""}
    </div>
  </div>
</div>`;

const page = `<!doctype html><meta charset="utf-8"><style>${css}
  body { margin:0; padding:20px; background:#fff; }
  /* THE RAIL NEEDS A HEIGHT, or the measurement is a lie. sidebar.scss puts
     __main at position:absolute inset:0 inside __rail, so with no height on
     the desk root the whole column collapses and __nav reads 0 in EVERY state —
     including the ones where the rule is supposed to leave it alone. The real
     desk gets this height from the viewport. */
  .desk-module { height: 260px; }
  .desk-module-sidebar__rail { width: 231px; flex: 0 0 231px; }
  .menu-topic, .menu-topic__ui { position:relative; display:flex; }
  .menu-topic-items__wrapper[data-direction="down"] { top:100%; }
  .drumee-picto, .desk-org-tab__stat-ico svg { width:16px; height:16px; }
  * { transition:none !important; animation:none !important; }
</style>
${desk("none", "")}
${desk("up", "live")}
${desk("parked", "parked")}
<pre id="out"></pre>
<script>
// Drawn AT ALL: display, plus a real box — a hidden ancestor would leave
// display reading flex on a child that nobody can see.
function drawn(id, sel) {
  var el = document.querySelector('#' + id + ' ' + sel);
  if (!el) return null;
  return { on: getComputedStyle(el).display !== 'none' && el.offsetHeight > 0,
           h: el.offsetHeight };
}
var L = [];
var ok = true;
function check(label, id, sel, want) {
  var d = drawn(id, sel);
  if (!d) { L.push('FAIL  ' + label + '   ' + sel + ' is not in the fixture'); ok = false; return; }
  var pass = d.on === want;
  if (!pass) ok = false;
  L.push((pass ? 'PASS  ' : 'FAIL  ') + label +
    '   drawn=' + d.on + '/' + want + '  h=' + d.h + '   (got/want)');
}
var PILL = '.desk-org-tab__open';
var RAIL = '.desk-module-sidebar__nav-main';
var NAV = '.desk-module-sidebar__nav';
var LOGO = '.desk-module-sidebar__logo-row';
var FOOT = '.desk-module-sidebar__footer';

// 1. No org screen: everything is drawn.
check('no screen  | Open pill  ', 'none', PILL, true);
check('no screen  | rail items ', 'none', RAIL, true);

// 2. The screen is up: the pill and the rail items go, and everything around
//    them stays — the nav column, the logo row inside it, the footer beside it.
check('screen up  | Open pill  ', 'up', PILL, false);
check('screen up  | rail items ', 'up', RAIL, false);
check('screen up  | nav column ', 'up', NAV, true);
check('screen up  | logo row   ', 'up', LOGO, true);
check('screen up  | footer     ', 'up', FOOT, true);

// 3. Parked (data-anim="out"): the screen is not on show, so the chrome is back.
//    Without the :not() guard this is the state that hides the desk's own
//    navigation for the rest of the session.
check('parked out | Open pill  ', 'parked', PILL, true);
check('parked out | rail items ', 'parked', RAIL, true);
L.push(ok ? 'ALL PASS' : 'FAILURES ABOVE');
document.getElementById('out').textContent = L.join('\\n');
</script>`;

const dir = mkdtempSync(join(tmpdir(), "org-open-pill-"));
const file = join(dir, "harness.html");
writeFileSync(file, page);
const dom = execFileSync(CHROME, [
  "--headless", "--no-sandbox", "--disable-gpu", "--allow-file-access-from-files",
  "--dump-dom", `file://${file}`,
], { encoding: "utf8", maxBuffer: 1 << 26 });
const out = /<pre id="out">([\s\S]*?)<\/pre>/.exec(dom);
if (!out) throw new Error(`harness produced no report\n${dom.slice(0, 2000)}`);
const report = out[1].replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
console.log(report);
process.exit(/FAILURES ABOVE/.test(report) ? 1 : 0);
