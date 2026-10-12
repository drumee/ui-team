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
const BASE = '.box{position:relative}.box[data-flow="y"]{display:flex;flex-direction:column}';
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
