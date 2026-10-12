// chat-search-highlight-dom.test.js — marking real DOM in headless Chromium.
//
//   node --test tests/chat-search-highlight-dom.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { CHROMIUM, runInChromium } = require("./helpers/chromium-dom");

const MOD = path.join(__dirname, "../src/drumee/builtins/window/folder/chat-search-highlight.js");
const skip = CHROMIUM ? false : "chromium not installed";

// One chat item as buildContent leaves it: reply quote and attachment card
// MOVED inside the bubble, card filename + its hover tooltip.
const ITEM = (id, text, file) => `
<div class="widget-chatItem" id="${id}">
  <div class="widget-chatItem__message-line other">
    <div class="widget-chatItem__conversation-content selectable-text">
      <div class="widget-chatItem-reply__main">quoted budget text</div>${text}
      <div class="widget-chatItem__attachment-wrapper">
        <div class="widget-chatItem__attachment-wrapper-list">
          <div class="media-grid__content document">
            <div class="media-grid__meta-row-top"><div class="filename">${file}</div></div>
            <div class="filename-tooltips">${file}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>`;

test("marks message text and card filename only", { skip }, () => {
  const r = runInChromium({
    modules: { H: MOD },
    body: `<div id="chat">${ITEM("i1", 'See the <a href="#">budget</a> draft, Budget v2', "Q3 Budget")}</div>`,
    fn: async ({ H }, document) => {
      const root = document.getElementById("chat");
      const n = H.highlightChat(root, "budget");
      const marks = [...root.querySelectorAll("mark.chat-search-hit")];
      return {
        n,
        texts: marks.map((m) => m.textContent),
        inQuote: root.querySelectorAll(".widget-chatItem-reply__main mark").length,
        inTooltip: root.querySelectorAll(".filename-tooltips mark").length,
        inFilename: root.querySelectorAll(".filename mark").length,
      };
    },
  });
  assert.equal(r.n, 3);
  assert.deepEqual(r.texts, ["budget", "Budget", "Budget"]);
  assert.equal(r.inQuote, 0);
  assert.equal(r.inTooltip, 0);
  assert.equal(r.inFilename, 1);
});

test("re-highlighting replaces old marks; unmark restores the exact DOM text", { skip }, () => {
  const r = runInChromium({
    modules: { H: MOD },
    body: `<div id="chat">${ITEM("i1", "Résumé and budget", "Résumé final")}</div>`,
    fn: async ({ H }, document) => {
      const root = document.getElementById("chat");
      const before = root.innerHTML;
      H.highlightChat(root, "budget");
      const second = H.highlightChat(root, "resume");
      const texts = [...root.querySelectorAll("mark.chat-search-hit")].map((m) => m.textContent);
      H.unmark(root);
      const bubble = root.querySelector(".widget-chatItem__conversation-content");
      // normalize() re-joined the split text nodes: no empty / adjacent text nodes left
      const adjacentText = [...bubble.childNodes].some(
        (n, i, a) => n.nodeType === 3 && a[i + 1] && a[i + 1].nodeType === 3,
      );
      return { second, texts, restored: root.innerHTML === before, adjacentText };
    },
  });
  assert.equal(r.second, 2);
  assert.deepEqual(r.texts, ["Résumé", "Résumé"]);
  assert.equal(r.restored, true);
  assert.equal(r.adjacentText, false);
});

test("a short query clears and marks nothing", { skip }, () => {
  const r = runInChromium({
    modules: { H: MOD },
    body: `<div id="chat">${ITEM("i1", "budget", "budget")}</div>`,
    fn: async ({ H }, document) => {
      const root = document.getElementById("chat");
      H.highlightChat(root, "budget");
      const n = H.highlightChat(root, "b");
      return { n, left: root.querySelectorAll("mark").length };
    },
  });
  assert.deepEqual(r, { n: 0, left: 0 });
});

// The page-side twin of ITEM, for fn bodies that render rows mid-test.
const PAGE_ITEM = `<script>window.ITEM_HTML = ${ITEM.toString()};</script>`;

test("live: rows and cards that render later are marked; stop clears and detaches", { skip }, () => {
  const r = runInChromium({
    modules: { H: MOD },
    body: `${PAGE_ITEM}<div id="chat">${ITEM("i1", "budget one", "plan")}</div>`,
    fn: async ({ H }, document) => {
      const flush = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };
      const root = document.getElementById("chat");
      const win = { ensurePart: () => Promise.resolve({ el: root }) };
      const count = () => root.querySelectorAll("mark.chat-search-hit").length;
      await H.start(win, "budget");
      const first = count();
      // an older page / incoming message renders
      root.insertAdjacentHTML("afterbegin", ITEM_HTML("i0", "old budget", "x"));
      await flush();
      const afterRow = count();
      // an attachment card lands later inside an existing row
      root.querySelector("#i1 .widget-chatItem__attachment-wrapper-list")
        .insertAdjacentHTML("beforeend", '<div class="media-grid__content"><div class="filename">budget.xlsx</div></div>');
      await flush();
      const afterCard = count();
      H.markCurrent(win, root.querySelector("#i1"));
      const current = root.querySelectorAll('[data-search-current="1"]').length;
      // a new query re-marks and drops the old "current" message
      await H.start(win, "one");
      const newQuery = count();
      const currentAfterNewQuery = root.querySelectorAll("[data-search-current]").length;
      H.markCurrent(win, root.querySelector("#i1"));
      H.stop(win);
      const afterStop = count();
      const currentAfterStop = root.querySelectorAll("[data-search-current]").length;
      root.insertAdjacentHTML("beforeend", ITEM_HTML("i2", "budget again", "y"));
      await flush();
      return {
        first, afterRow, afterCard, current, newQuery, currentAfterNewQuery,
        afterStop, currentAfterStop, detached: count(),
      };
    },
  });
  assert.deepEqual(r, {
    first: 1, afterRow: 2, afterCard: 3, current: 1, newQuery: 1, currentAfterNewQuery: 0,
    afterStop: 0, currentAfterStop: 0, detached: 0,
  });
});

test("live: a start resolving after stop, or after a newer start, does not paint", { skip }, () => {
  const r = runInChromium({
    modules: { H: MOD },
    body: `${PAGE_ITEM}<div id="chat">${ITEM("i1", "budget plan", "plan")}</div>`,
    fn: async ({ H }, document) => {
      const root = document.getElementById("chat");
      let release;
      const gate = new Promise((res) => (release = res));
      const win = { ensurePart: () => gate.then(() => ({ el: root })) };
      const p1 = H.start(win, "budget");
      H.stop(win);
      release();
      await p1;
      const afterStop = root.querySelectorAll("mark").length;
      const pa = H.start(win, "budget");
      const pb = H.start(win, "plan");
      await Promise.all([pa, pb]);
      const texts = [...root.querySelectorAll("mark")].map((m) => m.textContent);
      const short = await H.start(win, "p").then(() => root.querySelectorAll("mark").length);
      return { afterStop, texts, short };
    },
  });
  assert.deepEqual(r, { afterStop: 0, texts: ["plan", "plan"], short: 0 });
});
