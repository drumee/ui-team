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
  // show AND close both follow the debounced change: nothing happens on a
  // keystroke itself, so clearing and retyping quickly never flickers the card
  const run = method("_runChatSearch");
  const debounced = run.slice(run.indexOf("setTimeout("));
  assert.ok(run.indexOf("_hideChatSearchResults") > run.indexOf("setTimeout("), "close is debounced");
  assert.match(debounced, /if \(q\.length < 2\) return this\._hideChatSearchResults\(\);/);
  // a debounced query opens the card at once with placeholders, then the reply replaces them
  assert.match(debounced, /this\._showChatSearchLoading\(token\);[\s\S]*fetchService/);
  assert.match(debounced, /this\._showChatSearchResults\(rows, token\)/);
  // the results wait until the skeleton has been up SKELETON_MIN_MS
  assert.match(debounced, /const shownAt = Date\.now\(\);/);
  assert.match(debounced, /ResultsPanel\.holdSkeleton\(shownAt\)/);
  assert.ok(debounced.indexOf("holdSkeleton") < debounced.indexOf("_showChatSearchResults(rows, token)"), "hold before results");
  const loading = method("_showChatSearchLoading");
  assert.match(loading, /panel\.feed\(searchResultsLoading\(this\)\);/);
  assert.match(loading, /ResultsPanel\.open\(panel\.el\);/);
  // a part that resolves after the search was closed / superseded paints nothing
  for (const m of ["_showChatSearchLoading", "_showChatSearchResults"]) {
    assert.match(method(m), /if \(token !== this\._chatSearchToken\) return;/, m);
  }
  // nothing dismisses / re-opens around a click any more
  assert.ok(!src.includes("_dismissChatSearchResults"));
  assert.ok(!src.includes("_reopenChatSearchResults"));
});

test("closing the search lets the field slide out before the header comes back", () => {
  const close = method("_closeChatSearch");
  assert.match(close, /bar\.el\.dataset\.closing = "1";/);
  assert.match(close, /ResultsPanel\.afterAnimation\(/);
  assert.ok(close.indexOf("afterAnimation") < close.lastIndexOf("_updateChatHeader"), "header waits for the slide-out");
  // a scope switch / header re-feed during the slide-out wins; the flag never sticks
  assert.match(close, /if \(bar\.el\.dataset\.scope !== "search"\) return;/);
  assert.match(method("_updateChatHeader"), /delete bar\.el\.dataset\.closing;/);
});

test("skin styles the hits and the current message", () => {
  const scss = fs.readFileSync(path.join(__dirname, "..", "src/drumee/builtins/window/folder/skin/index.scss"), "utf8");
  assert.match(scss, /mark\.chat-search-hit \{/);
  assert.match(scss, /\[data-search-current="1"\] mark\.chat-search-hit \{/);
});
