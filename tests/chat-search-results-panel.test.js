// chat-search-results-panel.test.js — the chat-header search results card
// opens and closes with an animation (window/folder/search-results-panel.js +
// the folder skin), and the File threads bar stays hidden until the close
// animation has finished. Real CSS in headless Chromium.
//
//   node --test tests/chat-search-results-panel.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const sass = require("sass");
const { CHROMIUM, runInChromium } = require("./helpers/chromium-dom");

const SRC = path.join(__dirname, "..", "src/drumee");
const MOD = path.join(SRC, "builtins/window/folder/search-results-panel.js");
const css = sass.compile(path.join(SRC, "builtins/window/folder/skin/index.scss"), {
  loadPaths: [SRC, path.join(SRC, "skin")],
  silenceDeprecations: ["import", "global-builtin", "mixed-decls", "color-functions", "legacy-js-api"],
  logger: sass.Logger.silent,
}).css;
const BASE = '.box{position:relative}.box[data-flow="y"]{display:flex;flex-direction:column}' +
  '.drumee-widget[data-flow="x"],.box[data-flow="x"]{display:flex;flex-direction:row}';
const body = `<style>${BASE}${css}</style>
<div class="window-folder">
  <div class="window__chat-panel box" data-flow="y" style="width:360px;height:640px">
    <div id="ftbar" class="window__ft-bar box" data-flow="y"></div>
    <div id="results" class="window__search-results box" data-flow="y" data-open="0"><div id="row">row</div></div>
    <div id="plain" data-open="0"></div>
  </div>
</div>`;
const skip = CHROMIUM ? false : "chromium not installed";

test("open plays the show animation; close plays the hide one, then hides", { skip }, () => {
  const r = runInChromium({
    modules: { P: MOD },
    body,
    fn: async ({ P }, document) => {
      const el = document.getElementById("results");
      const cs = (id) => getComputedStyle(document.getElementById(id));
      const end = (target) => target.dispatchEvent(new AnimationEvent("animationend", { bubbles: true }));
      const out = {};
      P.open(el);
      out.opened = [el.dataset.open, cs("results").animationName, cs("ftbar").display];
      P.close(el);
      // still on screen, animating out; the File threads bar waits for it
      out.closing = [el.dataset.open, cs("results").animationName, cs("results").display, cs("ftbar").display];
      end(document.getElementById("row")); // a child's animation is not ours
      out.afterChildEnd = el.dataset.open;
      end(el);
      out.closed = [el.dataset.open, cs("results").display, cs("ftbar").display];
      P.close(el); // already closed: no-op
      out.closeAgain = el.dataset.open;
      return out;
    },
  });
  assert.deepEqual(r.opened, ["1", "window-folder__search-results-in", "none"]);
  assert.deepEqual(r.closing, ["closing", "window-folder__search-results-out", "flex", "none"]);
  assert.equal(r.afterChildEnd, "closing");
  assert.deepEqual(r.closed, ["0", "none", "flex"]);
  assert.equal(r.closeAgain, "0");
});

test("re-opening mid-close wins over the late animationend", { skip }, () => {
  const r = runInChromium({
    modules: { P: MOD },
    body,
    fn: async ({ P }, document) => {
      const el = document.getElementById("results");
      P.open(el);
      P.close(el);
      P.open(el);
      el.dispatchEvent(new AnimationEvent("animationend"));
      return el.dataset.open;
    },
  });
  assert.equal(r, "1");
});

test("an element with no hide animation (reduced motion) closes at once", { skip }, () => {
  const r = runInChromium({
    modules: { P: MOD },
    body,
    fn: async ({ P }, document) => {
      const el = document.getElementById("plain");
      P.open(el);
      P.close(el);
      return el.dataset.open;
    },
  });
  assert.equal(r, "0");
});

test("loading placeholder: one full-width row of shimmering bars", { skip }, () => {
  const ph =
    '<div class="window__search-result-ph"><div class="window__search-result-ph-top">' +
    '<div id="name0" class="window__search-result-ph-name"></div><div class="window__search-result-ph-time"></div></div>' +
    '<div class="window__search-result-ph-preview"></div><div class="window__search-result-ph-preview"></div></div>';
  const r = runInChromium({
    body: body.replace('<div id="row">row</div>',
      // As ui-core renders Skeletons.Element: the `wrapper` kind defaults to
      // flow x, i.e. a row flexbox (bars collapsed to dots before the fix).
      `<div class="window__search-results-loading drumee-widget box" data-flow="x"><div aria-hidden="true">${ph}</div></div>`),
    fn: async (mods, document) => {
      document.getElementById("results").dataset.open = "1";
      const bars = [...document.querySelectorAll('[class^="window__search-result-ph-"]:not(.window__search-result-ph-top)')];
      const row = document.querySelector(".window__search-result-ph");
      return {
        bars: bars.length,
        // layout size: the card's entrance animation scales the rects
        sized: bars.every((b) => b.offsetHeight >= 8 && b.offsetWidth >= 20),
        previews: [...row.querySelectorAll(".window__search-result-ph-preview")].map((b) => b.offsetWidth),
        pulse: [...new Set(bars.map((b) => getComputedStyle(b).animationName))],
        gradient: /gradient/.test(getComputedStyle(bars[0]).backgroundImage),
        rowHeight: row.offsetHeight,
        rowWidth: row.offsetWidth,
        nameWider: document.getElementById("name0").offsetWidth >
          document.querySelector(".window__search-result-ph-time").offsetWidth,
      };
    },
  });
  assert.equal(r.bars, 4);
  assert.equal(r.sized, true);
  assert.ok(r.rowWidth > 250, `the row spans the card (${r.rowWidth}px)`);
  assert.deepEqual(r.pulse, ["window-folder__search-skeleton-shimmer"]);
  assert.equal(r.gradient, true);
  // the second preview line is the short one, like a wrapped message
  assert.ok(r.previews[1] < r.previews[0] * 0.75, `previews ${r.previews}`);
  assert.ok(r.rowHeight >= 40 && r.rowHeight <= 72, `row ${r.rowHeight}`);
  assert.equal(r.nameWider, true);
});

test("hits: white text on the primary colour; the jumped-to message a darker primary", { skip }, () => {
  const r = runInChromium({
    body: `<style>${BASE}${css}</style><div class="window-folder">
      <p>a <mark id="hit" class="chat-search-hit">budget</mark></p>
      <div data-search-current="1"><mark id="cur" class="chat-search-hit">budget</mark></div></div>`,
    fn: async (m, document) => {
      const cs = (id) => getComputedStyle(document.getElementById(id));
      return [cs("hit").color, cs("hit").backgroundColor, cs("cur").color, cs("cur").backgroundColor];
    },
  });
  assert.deepEqual(r, ["rgb(255, 255, 255)", "rgb(89, 80, 255)", "rgb(255, 255, 255)", "rgb(70, 66, 169)"]);
});

const header = (closing) => `<style>${BASE}${css}</style><div class="window-folder">
  <div class="window__chat-header box" data-flow="x" data-scope="search"${closing ? ' data-closing="1"' : ""} style="width:360px;height:44px">
    <div id="back" class="window__chat-header-back"></div>
    <div id="input" class="window__chat-search-input"><input></div>
  </div></div>`;

test("search field slides in horizontally, and slides back out while closing", { skip }, () => {
  const fn = async (m, document) => {
    const cs = getComputedStyle(document.getElementById("input"));
    return [cs.animationName, cs.animationFillMode];
  };
  assert.deepEqual(runInChromium({ body: header(false), fn }), ["window-folder__chat-search-in", "none"]);
  assert.deepEqual(runInChromium({ body: header(true), fn }), ["window-folder__chat-search-out", "forwards"]);
});

test("afterAnimation waits for the element's own animation end; none → at once", { skip }, () => {
  const r = runInChromium({
    modules: { P: MOD },
    body: header(true),
    fn: async ({ P }, document) => {
      const input = document.getElementById("input");
      const log = [];
      P.afterAnimation(input, () => log.push("input"));
      input.querySelector("input").dispatchEvent(new AnimationEvent("animationend", { bubbles: true }));
      log.push("child-ended");
      input.dispatchEvent(new AnimationEvent("animationend"));
      input.dispatchEvent(new AnimationEvent("animationend")); // once only
      const plain = document.createElement("div");
      document.body.appendChild(plain);
      P.afterAnimation(plain, () => log.push("plain"));
      return log;
    },
  });
  assert.deepEqual(r, ["child-ended", "input", "plain"]);
});
