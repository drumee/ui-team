// chat-search-highlight-wiring.test.js — the folder window drives
// ./chat-search-highlight from its chat-header search. folder/index.js cannot
// be loaded under node, so this pins the wiring on its source (same approach
// as tests/folder-files-search-wiring.test.js).
//
//   node --test tests/chat-search-highlight-wiring.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const src = fs.readFileSync(path.join(__dirname, "..", "src/drumee/builtins/window/folder/index.js"), "utf8");
const method = (name) => {
  const i = src.indexOf(`\n  ${name}(`);
  assert.ok(i >= 0, `missing method ${name}`);
  return src.slice(i, src.indexOf("\n  }\n", i));
};

test("the module is required once", () => {
  assert.match(src, /const ChatSearchHighlight = require\("\.\/chat-search-highlight"\);/);
});

test("a debounced query starts the highlight; every teardown path stops it", () => {
  assert.match(method("_runChatSearch"), /ChatSearchHighlight\.start\(this, q\);/);
  // _hideChatSearchResults is the shared teardown: short query, back arrow,
  // header re-feed out of search mode, revoked file thread.
  assert.match(method("_hideChatSearchResults"), /ChatSearchHighlight\.stop\(this\);/);
  assert.match(method("_closeChatSearch"), /this\._hideChatSearchResults\(\);/);
  assert.match(method("onBeforeDestroy"), /ChatSearchHighlight\.stop\(this\);/);
});

test("the results panel module is required once", () => {
  assert.match(src, /const ResultsPanel = require\("\.\/search-results-panel"\);/);
});

test("clicking a result keeps the results open, marks and scrolls to the message", () => {
  const m = method("_jumpToSearchResult");
  assert.doesNotMatch(m, /_closeChatSearch|_hideChatSearchResults|_dismissChatSearchResults|ResultsPanel\.close/);
  assert.match(m, /ChatSearchHighlight\.markCurrent\(this, hit\.el\);/);
  // scrollIntoView shifts the whole desk when the message cannot be centred
  assert.doesNotMatch(m, /scrollIntoView/);
  assert.match(m, /ChatSearchHighlight\.scrollToHit\(list\.__container, hit\.el\);/);
});

test("results open and close through the animated panel; an emptied field closes them", () => {
  assert.match(method("_showChatSearchResults"), /ResultsPanel\.open\(panel\.el\);/);
  assert.match(method("_hideChatSearchResults"), /ResultsPanel\.close\(panel\.el\);/);
  // emptying the field (or < 2 chars) goes straight to the shared teardown
  assert.match(method("_runChatSearch"), /if \(q\.length < 2\) \{[^}]*return this\._hideChatSearchResults\(\);/);
  // nothing dismisses / re-opens around a click any more
  assert.ok(!src.includes("_dismissChatSearchResults"));
  assert.ok(!src.includes("_reopenChatSearchResults"));
});

test("skin styles the hits and the current message", () => {
  const scss = fs.readFileSync(path.join(__dirname, "..", "src/drumee/builtins/window/folder/skin/index.scss"), "utf8");
  assert.match(scss, /mark\.chat-search-hit \{/);
  assert.match(scss, /\[data-search-current="1"\] mark\.chat-search-hit \{/);
});
