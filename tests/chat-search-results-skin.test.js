// chat-search-results-skin.test.js — the chat-header search results drop down
// from the header as a card (the File threads dropdown's look), the
// conversation stays visible below it, and the File threads bar hides while it
// is open. Real layout: the compiled folder skin, measured in headless Chromium.
//
//   node --test tests/chat-search-results-skin.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const sass = require("sass");
const { CHROMIUM, runInChromium } = require("./helpers/chromium-dom");

const SRC = path.join(__dirname, "..", "src/drumee");
const css = sass.compile(path.join(SRC, "builtins/window/folder/skin/index.scss"), {
  loadPaths: [SRC, path.join(SRC, "skin")],
  silenceDeprecations: ["import", "global-builtin", "mixed-decls", "color-functions", "legacy-js-api"],
  logger: sass.Logger.silent,
}).css;
// ui-styles container.scss: what every Skeletons.Box carries.
const BASE = '.box{position:relative}.box[data-flow="y"]{display:flex;flex-direction:column}.box[data-flow="x"]{display:flex;flex-direction:row}';

const page = (open, rows) => `<style>${BASE}${css}</style>
<div class="window-folder">
  <div id="panel" class="window__chat-panel box" data-flow="y" style="width:360px;height:640px">
    <div class="window__chat-header box" data-flow="x" data-scope="search" style="height:44px;flex:0 0 44px"></div>
    <div class="window__topic-strip box" data-flow="x" style="height:36px;flex:0 0 36px"></div>
    <div id="ftbar" class="window__ft-bar box" data-flow="y"><div class="window__ft-bar-card box" data-flow="x" style="height:40px"></div></div>
    <div id="chat" class="window__chat-widget box" data-flow="y" style="flex:1 1 auto"></div>
    <div id="results" class="window__search-results box" data-flow="y" data-open="${open}">
      <div class="window__search-results-list box" data-flow="y">${'<div class="window__search-result box" data-flow="x" style="height:60px"></div>'.repeat(rows)}</div>
    </div>
  </div>
</div>`;

const measure = async (mods, document) => {
  const box = (id) => document.getElementById(id).getBoundingClientRect();
  const cs = (id) => getComputedStyle(document.getElementById(id));
  const panel = box("panel");
  const r = box("results");
  // Offsets from the panel's padding box (an absolute child's containing
  // block), not its border box: the chat panel draws a border.
  const p = document.getElementById("panel");
  const borderRight = panel.width - p.clientWidth - p.clientLeft;
  return {
    ftbarDisplay: cs("ftbar").display,
    resultsDisplay: cs("results").display,
    top: r.top - panel.top - p.clientTop,
    left: r.left - panel.left - p.clientLeft,
    right: panel.right - borderRight - r.right,
    height: r.height,
    panelHeight: panel.height,
    overflowY: cs("results").overflowY,
    shadow: cs("results").boxShadow,
    radius: cs("results").borderTopLeftRadius,
  };
};

const skip = CHROMIUM ? false : "chromium not installed";

test("open: a card under the header, inset, capped, scrolling; File threads bar hidden", { skip }, () => {
  const m = runInChromium({ body: page(1, 20), fn: measure });
  assert.equal(m.ftbarDisplay, "none");
  assert.equal(m.resultsDisplay, "flex");
  assert.ok(m.top >= 44 && m.top <= 52, `top ${m.top}`);
  assert.equal(m.left, 12);
  assert.equal(m.right, 12);
  // 20 rows of 60px would be 1200px: the card caps and scrolls instead of
  // covering the conversation down to the composer.
  assert.ok(m.height <= 400, `height ${m.height}`);
  assert.ok(m.height < m.panelHeight - 200, "conversation stays visible below the card");
  assert.equal(m.overflowY, "auto");
  assert.notEqual(m.shadow, "none");
  assert.equal(m.radius, "12px");
});

test("a short result list hugs its content", { skip }, () => {
  const m = runInChromium({ body: page(1, 1), fn: measure });
  assert.ok(m.height < 160, `height ${m.height}`);
});

test("closed: card hidden, File threads bar back", { skip }, () => {
  const m = runInChromium({ body: page(0, 3), fn: measure });
  assert.equal(m.resultsDisplay, "none");
  assert.equal(m.ftbarDisplay, "flex");
});
