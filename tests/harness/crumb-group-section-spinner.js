// Does the address chip's spinner ever stop on a SECTION screen?
//
// The chip's busy state carries NO JS FLAG — desk/skin/topbar.scss asks the
// DOM directly: `__crumb-group` paints an `::after` spinner and hides
// `.desk-breadcrumb__main`, and one rule takes both back:
//
//   &__crumb-group:has(.breadcrumb-item__icon):has(.breadcrumb-item__filename)
//
// It wants an ICON as well as a name. A section crumb — Organization, Settings,
// Get help, Trash, Inbox, Contacts, Admin console, Plan — renders NO icon:
// breadcrumb/item/skeleton pushes the folder art only `if (!isSection)`, because
// a label has no node behind it to draw. So the reveal rule can never match
// while a section screen is up, the base rules stand, and the chip spins
// forever with its own label hidden behind the spinner.
//
// Three states are measured, because the fix has to keep the middle one honest:
//
//   path     icon + filename   -> track shown, no spinner   (already right)
//   section  filename only     -> track shown, no spinner   (the bug)
//   loading  no crumbs at all  -> track hidden, spinner      (must not regress)
//
// Run:  node tests/harness/crumb-group-section-spinner.js
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
  sass("modules/desk/skin/index.scss"),
  sass("modules/desk/breadcrumb/skin/index.scss"),
  sass("modules/desk/breadcrumb/item/skin/index.scss"),
].join("\n");

// The REAL crumb markup. The item skeleton is driven twice — once as a path
// crumb, once as a section label — so the icon's presence or absence is the
// skeleton's own decision, not the fixture's.
const { installGlobals, installResolver, toHtml } = require("../helpers/render-skeleton.js");
const restoreG = installGlobals();
const restoreR = installResolver();
let pathCrumb;
let sectionCrumb;
try {
  const p = require.resolve(join(ROOT, "src/drumee/modules/desk/breadcrumb/item/skeleton/index.js"));
  delete require.cache[p];
  const item = require(p);
  const ui = (over) => ({
    fig: { family: "breadcrumb-item" },
    getIndex: () => 0,
    mget: (k) => over[k],
  });
  // A workspace root, as _buildContent hands it over: filetype hub, a name,
  // and no isSection.
  pathCrumb = toHtml(item(ui({
    filename: "Acme Workspace", filetype: "hub", area: "private", home_id: "7", hub_id: "7",
  })));
  // What every desk section trigger produces: `{ filename }` alone, which
  // _updateContext turns into isSection 1 (no filetype, no nid).
  sectionCrumb = toHtml(item(ui({ filename: "Organization", isSection: 1 })));
} finally { restoreR(); restoreG(); }

// __left-cluster > __crumb-group > .desk-breadcrumb__ui > __main > __content >
// crumbs, then the switcher as the breadcrumb's NEXT SIBLING inside the chip
// (desk/skeleton/topbar.js).
//
// The cluster is not decoration here: the rule that hides the caret on a
// section screen is authored inside `&__left-cluster`, so it compiles to
// `.desk-module-topbar__left-cluster .desk-breadcrumb__ui[data-section="1"] +
// .desk-module-topbar__ws-wrapper`. Drop the ancestor and the caret's section
// behaviour cannot be measured at all.
// `hide` stamps data-hide-address, which desk_breadcrumb._setSectionMode
// writes for the organisation screen alone. The chip carries an inline
// `display: flex` on purpose: that is what a Box child can arrive with, and it
// is why the hiding rule needs `!important` — without it the measurement below
// would pass in the harness and fail in the app.
const chip = (id, section, crumbs, hide) => `
<div class="box desk-module-topbar__left-cluster" data-flow="x">
  <div class="box desk-module-topbar__crumb-group" data-flow="x" id="${id}"
       style="display:flex">
    <div class="box desk-breadcrumb desk-breadcrumb__ui" data-flow="x"
         data-section="${section}"${hide ? ' data-hide-address="1"' : ""}>
      <div class="box desk-breadcrumb__main" data-flow="x">
        <div class="box desk-breadcrumb__content" data-flow="x">${crumbs}</div>
      </div>
    </div>
    <div class="box desk-module-topbar__ws-wrapper" data-flow="x">
      <div class="box desk-module-topbar__ws-btn" data-flow="x">v</div>
    </div>
  </div>
</div>`;

const page = `<!doctype html><meta charset="utf-8"><style>${css}
  body { margin:0; padding:40px; background:#fff; display:flex; flex-direction:column; gap:40px; }
  * { transition:none !important; animation-duration:0s !important; }
</style>
${chip("path", 0, pathCrumb)}
${chip("section", 1, sectionCrumb)}
${chip("loading", 0, "")}
${chip("orgview", 1, sectionCrumb, 1)}
<pre id="out"></pre>
<script>
// The spinner is a pseudo-element: \`content\` is 'none' when the reveal rule
// has taken it back, and '""' while it is painted.
function state(id) {
  var el = document.getElementById(id);
  var after = getComputedStyle(el, '::after');
  var main = el.querySelector('.desk-breadcrumb__main');
  var btn = el.querySelector('.desk-module-topbar__ws-btn');
  return {
    spinner: after.content !== 'none',
    track: getComputedStyle(main).display !== 'none',
    // Drawn AT ALL: a section screen hides the whole __ws-wrapper, so asking
    // only about the button's own visibility would call a caret inside a
    // display:none parent "visible".
    caret: getComputedStyle(btn).visibility === 'visible' && btn.offsetParent !== null,
  };
}
var L = [];
var ok = true;
function check(label, got, want) {
  var pass = got.spinner === want.spinner && got.track === want.track
    && got.caret === want.caret;
  if (!pass) ok = false;
  L.push((pass ? 'PASS  ' : 'FAIL  ') + label +
    '   spinner=' + got.spinner + '/' + want.spinner +
    '  track=' + got.track + '/' + want.track +
    '  caret=' + got.caret + '/' + want.caret + '   (got/want)');
}
// A resolved path: already correct, and asserted so the fix cannot trade one
// state for another.
check('path crumb   (icon + name)', state('path'),
      { spinner: false, track: true, caret: true });
// A section label: the bug. Its name is in the chip, so the chip is NOT busy —
// and the caret stays away, because there is no workspace behind the word
// "Organization" for a dropdown to act on.
check('section label (name only) ', state('section'),
      { spinner: false, track: true, caret: false });
// Nothing in the track at all — the breadcrumb has not resolved, or its lazy
// chunk is still downloading. This is the ONLY state the spinner is for.
check('loading      (no crumbs)  ', state('loading'),
      { spinner: true, track: false, caret: false });
// The organisation screen: no chip at all, because the org chip beside it
// already names the organisation. Checked as "not rendered", not as
// "spinner off" — an invisible spinner inside a hidden chip is still the wrong
// answer if the box is there taking up room.
var org = document.getElementById('orgview');
var orgHidden = org.offsetParent === null && org.offsetWidth === 0;
if (!orgHidden) ok = false;
L.push((orgHidden ? 'PASS  ' : 'FAIL  ') + 'org view     (hideAddress) ' +
  '  chip drawn=' + !orgHidden + '/false' +
  '  width=' + org.offsetWidth + '   (got/want)');
L.push(ok ? 'ALL PASS' : 'FAILURES ABOVE');
document.getElementById('out').textContent = L.join('\\n');
</script>`;

const dir = mkdtempSync(join(tmpdir(), "crumb-spin-"));
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
