// chat-search-results-skin.test.js — the chat-header search results take the
// File threads bar's slot (under the topic strip, same inset, card look), the
// conversation stays visible below them, and the File threads bar hides while
// they are open. Real layout: the compiled folder skin, measured in headless Chromium.
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
// Geometry only: the show keyframes (tests/chat-search-results-panel) would be
// measured at their first frame.
const BASE = '*{animation:none!important}.box{position:relative}.box[data-flow="y"]{display:flex;flex-direction:column}.box[data-flow="x"]{display:flex;flex-direction:row}';

const page = (open, rows) => `<style>${BASE}${css}</style>
<div class="window-folder">
  <div id="panel" class="window__chat-panel box" data-flow="y" style="width:360px;height:640px">
    <div class="window__chat-header box" data-flow="x" data-scope="search" style="height:44px;flex:0 0 44px"></div>
    <div class="window__topic-strip box" data-flow="x" style="height:36px;flex:0 0 36px"></div>
    <div id="ftbar" class="window__ft-bar box" data-flow="y"><div id="ftcard" class="window__ft-bar-card box" data-flow="x" style="height:40px"></div></div>
    <div id="results" class="window__search-results box" data-flow="y" data-open="${open}">
      <div class="window__search-results-list box" data-flow="y">${'<div class="window__search-result box" data-flow="x" style="height:60px"></div>'.repeat(rows)}</div>
    </div>
    <div class="window__chat-info-slot box" data-flow="y" data-open="0"></div>
    <div id="chat" class="window__chat-widget box" data-flow="y" style="flex:1 1 auto;min-height:0"></div>
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
    ftCardTop: box("ftcard").top - panel.top - p.clientTop,
    chatHeight: box("chat").height,
    overflowY: cs("results").overflowY,
    shadow: cs("results").boxShadow,
    radius: cs("results").borderTopLeftRadius,
  };
};

const skip = CHROMIUM ? false : "chromium not installed";

test("open: a card in the File threads slot, inset, capped, scrolling; bar hidden", { skip }, () => {
  const closed = runInChromium({ body: page(0, 3), fn: measure });
  const m = runInChromium({ body: page(1, 20), fn: measure });
  assert.equal(m.ftbarDisplay, "none");
  assert.equal(m.resultsDisplay, "flex");
  // exactly where the File threads card sits when search is closed:
  // under the topic strip, not over it
  assert.equal(m.top, closed.ftCardTop);
  assert.equal(m.left, 12);
  assert.equal(m.right, 12);
  // 20 rows of 60px would be 1200px: the card caps and scrolls instead of
  // pushing the conversation out
  assert.ok(m.height <= 360, `height ${m.height}`);
  assert.ok(m.chatHeight >= 150, `conversation keeps ${m.chatHeight}px below the card`);
  assert.equal(m.overflowY, "auto");
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
