// Can the org chip's stat tooltips leave the dropdown, and does the closed
// panel still stay hidden?
//
// THE CLIPPER IS NOT THE PANEL. `desk-org-tab__panel` declares no `overflow`
// at all — the box that cuts the tooltip off is `.menu-topic-items__wrapper`,
// and its `overflow: hidden` is an INLINE style written by the menu widget
// itself:
//
//   letc/widgets/menu/index.js  onPartReady()  case 'items-wrapper':
//     child.$el.css({ position: 'absolute', overflow: 'hidden' })
//
// The wrapper shrink-wraps the panel, so its clip rect and the panel's border
// coincide — which is why this reads as "the panel clips it". Being inline, it
// outranks every stylesheet: only `!important` can lift it, exactly as
// desk/skin/topbar.scss already does for __add-wrapper and __ws-wrapper.
//
// THE CLIP IS LOAD-BEARING WHILE CLOSED, which is why the override is gated.
// A `direction: down` menu is closed by translating `.menu-topic-items` up by
// (items + trigger) height (menu/index.js _closeItems -> gsap.to y: -y) and
// letting the wrapper's overflow swallow it. Lift the clip unconditionally and
// the shut panel is painted over the topbar. So the gate is the MENU ROOT's
// `data-state`, set to 1 in _onOpen and 0 in _close/_onClosed — not the
// wrapper's own `data-state`, which is written "open" in _openItems and never
// written back (grep dataset.state in that file: line 355 has no counterpart).
//
// Run:  node tests/harness/org-tab-tooltip-clip.js
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

// vars/index carries the custom properties the skin reads; lib/container is
// what turns `.box[data-flow]` into a flex row or column. Without the second
// nothing in the panel lays out and every measurement below is fiction.
const css = [
  sass("skin/vars/index.scss"),
  sass("skin/lib/container.scss"),
  sass("modules/desk/org-tab/skin/index.scss"),
].join("\n");

// The REAL panel markup, not a hand-written stand-in.
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
    role: "owner",
    departments: [],
    workspaces: [],
    can_manage: 1,
    can_browse: 1,
  }));
} finally { restoreR(); restoreG(); }

// The chain ui-core actually builds (menu/skeleton/index.js): the widget root
// carries `menu-topic` AND the className the skeleton passed, then
// .menu-trigger + .menu-topic-items__wrapper > .menu-topic-items, and the fed
// `items:` box is a child of that. The wrapper's inline style is copied
// verbatim from the widget's onPartReady.
const chain = (rootState, itemsShift) => `
<div class="box menu-topic menu-topic__ui desk-org-tab__wrapper" data-flow="x"
     data-state="${rootState}">
  <div class="box menu-topic-trigger menu-trigger" data-flow="x" style="height:30px">chip</div>
  <div class="box menu-topic-items__wrapper" data-flow="y" data-state="open"
       data-direction="down" style="position:absolute;overflow:hidden">
    <div class="box menu-topic-items menu-items" data-flow="y" data-state="open"
         style="transform:translateY(${itemsShift}px)">
      <div class="box desk-org-tab__items" data-flow="y">${panelHtml}</div>
    </div>
  </div>
</div>`;

const page = `<!doctype html><meta charset="utf-8"><style>${css}
  body { margin:0; padding:120px; background:#fff; }
  /* Framework bits a standalone skin compile lacks. */
  .menu-topic, .menu-topic__ui, .menu-trigger { position:relative; display:flex; }
  .menu-topic-items__wrapper[data-direction="down"] { top:100%; }
  .drumee-picto, .desk-org-tab__stat-ico svg { width:16px; height:16px; }
  #closed { position:absolute; top:600px; }
  * { transition:none !important; animation:none !important; }
</style>
<div id="open">${chain(1, 0)}</div>
<div id="closed">${chain(0, -400)}</div>
<pre id="out"></pre>
<script>
// __addTooltips (letc/addons/letc.js): a bare div with tt.className, appended
// INSIDE the icon and shown on pointerenter. No parent/sibling flag is
// passed by stat(), so this is where the bubble lives.
function tip(scope) {
  var ico = document.querySelector(scope + ' .desk-org-tab__stat-ico');
  var el = document.createElement('div');
  el.className = 'desk-org-tab__tip';
  el.innerHTML = 'DEPARTMENTS';
  ico.appendChild(el);
  return el;
}
// The visible slice of \`el\` after every clipping ancestor has had its say.
function clipped(el) {
  var r = el.getBoundingClientRect();
  var top = r.top, bottom = r.bottom, left = r.left, right = r.right;
  var names = [];
  for (var n = el.parentElement; n && n !== document.documentElement; n = n.parentElement) {
    var cs = getComputedStyle(n);
    if (cs.overflow === 'visible' && cs.overflowX === 'visible' && cs.overflowY === 'visible') continue;
    var b = n.getBoundingClientRect();
    names.push(n.className.replace(/\\s*box\\s*/, '') + '[' + cs.overflow + ']');
    top = Math.max(top, b.top); bottom = Math.min(bottom, b.bottom);
    left = Math.max(left, b.left); right = Math.min(right, b.right);
  }
  return {
    h: r.height, w: r.width,
    visH: Math.max(0, bottom - top), visW: Math.max(0, right - left),
    clippers: names,
  };
}

var L = [];
var ok = true;
function check(label, cond, detail) {
  L.push((cond ? 'PASS  ' : 'FAIL  ') + label + '   ' + detail);
  if (!cond) ok = false;
}

// 1. OPEN: the tooltip must be whole.
var o = clipped(tip('#open'));
check('open: tooltip not clipped', o.visH >= o.h - 0.5 && o.visW >= o.w - 0.5,
      'visible ' + o.visH.toFixed(1) + 'x' + o.visW.toFixed(1) +
      ' of ' + o.h.toFixed(1) + 'x' + o.w.toFixed(1) +
      '  clippers=[' + o.clippers.join(', ') + ']');

// 2. CLOSED: the panel must still be swallowed by the wrapper, or a shut
//    dropdown paints over the topbar. This is the regression an ungated
//    \`overflow: visible\` would cause, so it is asserted, not assumed.
var c = clipped(document.querySelector('#closed .desk-org-tab__panel'));
check('closed: panel still clipped away', c.visH <= 0.5,
      'visible height ' + c.visH.toFixed(1) + ' of ' + c.h.toFixed(1) +
      '  clippers=[' + c.clippers.join(', ') + ']');

L.push(ok ? 'ALL PASS' : 'FAILURES ABOVE');
document.getElementById('out').textContent = L.join('\\n');
</script>`;

const dir = mkdtempSync(join(tmpdir(), "org-tab-tip-"));
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
