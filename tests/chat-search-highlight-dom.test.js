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
