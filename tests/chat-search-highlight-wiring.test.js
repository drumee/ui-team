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

test("jumping to a result keeps the search open and marks the message", () => {
  const m = method("_jumpToSearchResult");
  assert.doesNotMatch(m, /_closeChatSearch/);
  assert.match(m, /this\._dismissChatSearchResults\(\);/);
  assert.match(m, /ChatSearchHighlight\.markCurrent\(this, hit\.el\);/);
  // scrollIntoView shifts the whole desk when the message cannot be centred
  assert.doesNotMatch(m, /scrollIntoView/);
  assert.match(m, /ChatSearchHighlight\.scrollToHit\(list\.__container, hit\.el\);/);
});

test("results are remembered and re-open when the field is focused again", () => {
  assert.match(method("_showChatSearchResults"), /this\._chatSearchHasResults = true;/);
  assert.match(method("_hideChatSearchResults"), /this\._chatSearchHasResults = false;/);
  assert.match(method("_reopenChatSearchResults"), /if \(!this\._chatSearchHasResults\) return;/);
  assert.match(src, /inputEl\.addEventListener\("focus", \(\) =>\s*this\._reopenChatSearchResults\(\),?\s*\);/);
});

test("skin styles the hits and the current message", () => {
  const scss = fs.readFileSync(path.join(__dirname, "..", "src/drumee/builtins/window/folder/skin/index.scss"), "utf8");
  assert.match(scss, /mark\.chat-search-hit \{/);
  assert.match(scss, /\[data-search-current="1"\] mark\.chat-search-hit \{/);
});
