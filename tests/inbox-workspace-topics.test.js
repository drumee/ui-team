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

// ── Skeleton ──
const node = (type) => (opt = {}) => ({ type, ...opt });
global.Skeletons = { Box: { X: node("Box.X"), Y: node("Box.Y") }, Wrapper: { X: node("Wrapper.X"), Y: node("Wrapper.Y") }, Note: node("Note"), Image: { Svg: node("Image.Svg") }, Button: { Svg: node("Button.Svg") }, Element: node("Element"), Entry: node("Entry"), List: { Smart: node("List.Smart") } };
global.LOCALE = new Proxy({}, { get: (t, k) => k });
global._a = new Proxy({}, { get: (t, k) => k });
global._e = new Proxy({}, { get: (t, k) => k });
global.Visitor = { id: "me", get: () => "" };
global._ = require("underscore");
global.Preset = { List: { Orange_e: {} } };
global.Desk = { isSupportContact: () => false };
const walk = (n, out = []) => { if (Array.isArray(n)) { n.forEach((k) => walk(k, out)); return out; } if (!n || typeof n !== "object") return out; out.push(n); (n.kids || []).forEach((k) => walk(k, out)); return out; };

test("skeleton: chat area = header · topic strip · ft bar · chat panel; the dialog slot is always there", () => {
  const Module = require("node:module");
  const load = Module._load;
  Module._load = function (r, ...a) { if (r === "./chat-header") return () => ({ kind: "header" }); return load.call(this, r, ...a); };
  const api = () => ({});
  const ui = { fig: { family: "chat-p2p", group: "chat-p2p" }, mget: () => undefined, getContactsApi: api, getDirectApi: api, getPeopleApi: api, getWorkspaceApi: api, _radioId: "r" };
  let tree;
  try { tree = require("../src/drumee/builtins/widget/chat-p2p/skeleton")(ui); } finally { Module._load = load; }
  const all = walk(tree);
  const area = all.find((n) => n.sys_pn === "chat-area");
  assert.ok(area, "chat-area part");
  assert.equal(area.dataset.topics, "0");
  assert.deepEqual(area.kids.map((k) => k.sys_pn), ["chat-header", "topic-strip", "ft-bar", "chat-panel"]);
  assert.equal(area.kids[1].className, "window__topic-strip");
  assert.equal(area.kids[2].className, "window__ft-bar");
  assert.equal(area.kids[2].dataset.open, "0");
  assert.equal(area.kids[1].partHandler, ui);
  const slot = all.find((n) => n.name === "topic-dialog");
  assert.equal(slot.className, "widget-topic-create__viewport-backdrop");
  assert.equal(slot.partHandler, ui);
});
