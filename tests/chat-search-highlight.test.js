// chat-search-highlight.test.js — the fold/match half of the chat-header
// search highlight (window/folder/chat-search-highlight.js), plain node.
//
//   node --test tests/chat-search-highlight.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const { foldRanges } = require("../src/drumee/builtins/window/folder/chat-search-highlight");

const hits = (text, q) => foldRanges(text, q).map(([s, e]) => text.slice(s, e));

test("case-insensitive, every occurrence, non-overlapping", () => {
  assert.deepEqual(hits("Budget and BUDGET and budget", "budget"), ["Budget", "BUDGET", "budget"]);
  assert.deepEqual(hits("aaaa", "aa"), ["aa", "aa"]);
});

test("accent-insensitive both ways, offsets cover the original characters", () => {
  assert.deepEqual(hits("Résumé final", "resume"), ["Résumé"]);
  assert.deepEqual(hits("resume final", "RÉSUMÉ"), ["resume"]);
  // decomposed source: e + U+0301 — the combining mark belongs to the hit
  assert.deepEqual(hits("Résumé!", "resume"), ["Résumé"]);
});

test("wildcard characters are literal", () => {
  assert.deepEqual(hits("50% of 500", "50%"), ["50%"]);
  assert.deepEqual(hits("file_v2 fileXv2", "file_v2"), ["file_v2"]);
});

test("queries under 2 folded characters, or empty text, match nothing", () => {
  assert.deepEqual(foldRanges("abc", "a"), []);
  assert.deepEqual(foldRanges("abc", "  "), []);
  assert.deepEqual(foldRanges("", "ab"), []);
  assert.deepEqual(foldRanges(null, "ab"), []);
});

test("query is trimmed, astral characters keep offsets right", () => {
  assert.deepEqual(hits("😀 budget 😀", "  budget "), ["budget"]);
});
