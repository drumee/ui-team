// inbox-workspace-topics.test.js — the Inbox (chat_p2p) Workspace chat's
// topic strip + File threads bar: skin, skeleton parts, and the
// widget/chat-p2p/workspace-topics module against a fake Inbox.
//
//   node --test tests/inbox-workspace-topics.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const sass = require("sass");
const SRC = path.join(__dirname, "..", "src/drumee");
const compile = (f) =>
  sass.compile(path.join(SRC, f), { loadPaths: [SRC, path.join(SRC, "skin")], logger: sass.Logger.silent }).css.replace(/\s+/g, " ");
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const ruleIn = (css, sel) => {
  const m = css.match(new RegExp("(?:^|\\}\\s*)" + esc(sel) + " \\{([^}]*)\\}"));
  assert.ok(m, `missing ${sel}`);
  return m[1];
};

test("skin: the Inbox chat area styles the strip and bar exactly as the folder does", () => {
  const inbox = compile("builtins/widget/chat-p2p/skin/index.scss");
  const folder = compile("builtins/window/folder/skin/index.scss");
  for (const part of [".window__topic-strip", ".window__topic-page .window__topic-tab", ".window__ft-bar-card", ".window__ft-list", ".window__topic-strip .window__topic-tab--create"]) {
    assert.equal(ruleIn(inbox, `.chat-p2p__chat-area ${part}`), ruleIn(folder, `.window-folder ${part}`), part);
  }
  assert.match(inbox, /@keyframes topic-page-next/);
  assert.equal((folder.match(/@keyframes topic-page-next/g) || []).length, 1, "keyframes emitted once in the folder skin");
});

test("skin: hidden in the Inbox unless the chat area is stamped data-topics=1", () => {
  const inbox = compile("builtins/widget/chat-p2p/skin/index.scss");
  assert.match(inbox, /\.chat-p2p__chat-area:not\(\[data-topics="?1"?\]\) \.window__topic-strip, \.chat-p2p__chat-area:not\(\[data-topics="?1"?\]\) \.window__ft-bar \{ display: none; \}/);
});
