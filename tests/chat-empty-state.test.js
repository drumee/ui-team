// chat-empty-state.test.js — the workspace team chat's empty state
// (Figma 920:122905 side column, 922:124283 full Chat tab) and when it
// applies. Everything else keeps "No discussions yet".
//
//   node --test tests/chat-empty-state.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const _load = Module._load;
Module._load = function (request, ...rest) {
  if (request.startsWith("assets/")) return `/static/${request}`;
  return _load.call(this, request, ...rest);
};
const node = (type) => (opt = {}) => ({ type, ...opt });
global.Skeletons = {
  Box: { X: node("Box.X"), Y: node("Box.Y") },
  Note: (o, cls) => (typeof o === "string" ? { type: "Note", content: o, className: cls } : { type: "Note", ...o }),
  Element: node("Element"),
};
const en = require("../locale/en.json");
global.LOCALE = new Proxy(en, { get: (t, k) => (k in t ? t[k] : k) });

const CE = require("../src/drumee/builtins/widget/chat/skeleton/empty-state");
const chat = (attrs = {}, extra = {}) => ({
  fig: { family: "widget-chat" },
  mget: (k) => attrs[k],
  ...extra,
});
const walk = (n, out = []) => {
  if (!n || typeof n !== "object") return out;
  out.push(n);
  (n.kids || []).forEach((k) => walk(k, out));
  return out;
};

test("workspace team chat → team empty state", () => {
  const s = CE.chatEmptyState(chat({ scope: "workspace" }));
  assert.deepEqual(s.className.split(" ").sort(), ["no-content", "widget-chat__team-empty"]);
  const notes = walk(s).filter((n) => n.type === "Note").map((n) => n.content);
  assert.deepEqual(notes, [en.CHAT_EMPTY_TITLE, en.CHAT_EMPTY_TEXT]);
  const imgs = walk(s).filter((n) => n.tagName === "img");
  assert.deepEqual(imgs.map((i) => i.attribute.src), [
    "/static/assets/empty-states/chat-empty-back.svg",
    "/static/assets/empty-states/chat-empty-front.svg",
  ]);
  for (const i of imgs) assert.equal(i.attribute.alt, "");
});

test("file scope → generic note", () => {
  const s = CE.chatEmptyState(chat({ scope: "workspace" }, { scopedFileNid: "f1" }));
  assert.equal(s.type, "Note");
  assert.equal(s.content, en.NO_DISCUSSIONS_YET);
  assert.equal(s.className, "no-content");
});

test("DMZ share, personal and unscoped chats keep the generic note", () => {
  for (const attrs of [{ scope: "folder" }, { area: "personal" }, {}]) {
    const s = CE.chatEmptyState(chat(attrs));
    assert.equal(s.content, en.NO_DISCUSSIONS_YET, JSON.stringify(attrs));
  }
});

test("skeleton: support placeholder still wins, else chatEmptyState", () => {
  const src = fs.readFileSync(path.join(__dirname, "..", "src/drumee/builtins/widget/chat/skeleton/index.js"), "utf8");
  assert.match(src, /placeholder: supportPlaceholder\(ui\) \|\| chatEmptyState\(ui\),/);
  assert.match(src, /require\(['"]\.\/empty-state['"]\)/);
});

test("setScopedFileNid re-sets the placeholder before restart", () => {
  const src = fs.readFileSync(path.join(__dirname, "..", "src/drumee/builtins/widget/chat/index.js"), "utf8");
  const start = src.indexOf("  setScopedFileNid(");
  const body = src.slice(start, src.indexOf("\n  }\n", start));
  const mset = body.indexOf("list.mset(_a.placeholder, chatEmptyState(this));");
  const restart = body.indexOf("list.restart();");
  assert.ok(mset > 0, "placeholder not re-set on file scope change");
  assert.ok(mset < restart, "must be set before restart renders the empty answer");
  assert.match(src, /require\(["']\.\/skeleton\/empty-state["']\)/);
});
