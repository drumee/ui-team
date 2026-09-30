// folder-topics.test.js — the folder window as host of folder chat topics
// (window/folder/topics.js): fetch, the menu options, scoping the chat, the
// New Topic dialog slot, create, folder navigation.
//
//   node --test tests/folder-topics.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");
const node = (type) => (opt = {}) => ({ type, ...opt });
global.Skeletons = { Box: { X: node("Box.X"), Y: node("Box.Y") }, Wrapper: { Y: node("Wrapper.Y") }, Note: node("Note"), Image: { Svg: node("Image.Svg") }, Button: { Svg: node("Button.Svg") } };
const en = require("../locale/en.json");
global.LOCALE = new Proxy(en, { get: (t, k) => (k in t ? t[k] : k) });
global._a = new Proxy({}, { get: (t, k) => k });
global._e = new Proxy({}, { get: (t, k) => k });
global.SERVICE = { channel: { topic_list: "channel.topic_list", topic_create: "channel.topic_create" } };
const _load = Module._load;
Module._load = function (r, ...a) {
  if (r === "../../skeleton/toolkit") return { dialog: () => node("dialog")(), tooltips: () => node("tooltips")(), tabBar: () => node("tabBar")(), splitBody: () => node("splitBody")() };
  if (r === "./topbar") return () => node("topbar")();
  return _load.call(this, r, ...a);
};
const T = require("../src/drumee/builtins/window/folder/topics");
const grid = require("../src/drumee/builtins/window/folder/skeleton");
const flush = () => new Promise((r) => setImmediate(r));

function fakeWindow({ canChat = true, tab = "chat", compact = false, create = { id: "t9", folder_nid: "fA", name: "Design", emoji: "😀" } } = {}) {
  const calls = [];
  const parts = {};
  const mk = (pn) => (parts[pn] = parts[pn] || { pn, el: { dataset: {} }, fed: [], feed(k) { this.fed.push(k); }, clear() { this.fed.push("clear"); } });
  const chat = { scopedTopicId: "general", setScopedTopic(t) { calls.push(["topic", t]); this.scopedTopicId = t || "general"; } };
  const w = {
    calls, parts, chat,
    fig: { group: "window", family: "window-folder" },
    activeTab: tab,
    _isCompactChat: () => compact,
    mget: (k) => ({ hub_id: "h1", actual_hub_id: "hA", nid: "fA", privilege: canChat ? 7 : 3 })[k],
    _privilegeGrantsChat: () => canChat,
    ensurePart: (pn) => Promise.resolve(pn === "folder-chat" ? chat : mk(pn)),
    fetchService: async (args) => (calls.push(["fetch", args]), [{ id: "t1", name: "Budget", emoji: "💰", unread: 2 }]),
    postService: async (args) => (calls.push(["post", args]), create),
    append() { calls.push(["append"]); },
    _closeThreadMenu() { calls.push(["closeMenu"]); },
    _populateThreadRail() { calls.push(["rail"]); },
    _setThreadRailActive(n) { calls.push(["railActive", n]); },
    _updateChatHeader(f, l, g) { calls.push(["header", f, l, g]); },
    scopeChatToFile(n) { calls.push(["file", n]); this._scopedFileNid = n ? `${n}` : ""; },
  };
  return w;
}

test("fetch passes hub/folder; skipped without chat access", async () => {
  const w = fakeWindow();
  const rows = await T.fetchTopics(w);
  assert.deepEqual(w.calls[0], ["fetch", { service: "channel.topic_list", hub_id: "hA", folder_nid: "fA" }]);
  assert.equal(rows[0].id, "t1");
  assert.deepEqual(T.menuOpts(w), { topics: rows, topicId: "all", canCreateTopic: true });
  const g = fakeWindow({ canChat: false });
  assert.deepEqual(await T.fetchTopics(g), []);
  assert.equal(g.calls.length, 0);
  assert.equal(T.menuOpts(g).canCreateTopic, false);
});

test("topic-new opens the dialog in the topic-dialog slot, never appends", async () => {
  const w = fakeWindow();
  await T.openTopicDialog(w);
  const d = w.parts["wrapper-topic-dialog"].fed.at(-1);
  assert.equal(d.kind, "widget_topic_create");
  assert.equal(d.folder_nid, "fA");
  assert.equal(d.hub_id, "hA");
  assert.equal(d.host, w);
  assert.ok(!w.calls.some((c) => c[0] === "append"));
  assert.ok(w.calls.some((c) => c[0] === "closeMenu"));
  T.closeTopicDialog(w);
  assert.equal(w.parts["wrapper-topic-dialog"].fed.at(-1), "clear");
});

test("create ok → the rail repaints with the new topic active and the chat is scoped to it", async () => {
  const w = fakeWindow();
  await T.fetchTopics(w);
  const r = await T.createTopic(w, { name: "Design", emoji: "😀" });
  assert.equal(r.ok, true);
  assert.deepEqual(w.calls.find((c) => c[0] === "post")[1], { service: "channel.topic_create", hub_id: "hA", folder_nid: "fA", name: "Design", emoji: "😀" });
  assert.deepEqual(T.menuOpts(w).topics.map((t) => t.id), ["t1", "t9"]);
  assert.equal(T.menuOpts(w).topicId, "t9");
  assert.ok(w.calls.some((c) => c[0] === "topic" && c[1] === "t9"));
  assert.ok(w.calls.some((c) => c[0] === "railActive"));
});

test("create TOPIC_EXISTS → {ok:false} and no scope change", async () => {
  const w = fakeWindow({ create: { status: "TOPIC_EXISTS" } });
  const r = await T.createTopic(w, { name: "Design", emoji: "😀" });
  assert.deepEqual(r, { ok: false, status: "TOPIC_EXISTS" });
  assert.ok(!w.calls.some((c) => c[0] === "topic"));
  assert.equal(T.menuOpts(w).topicId, "all");
});

test("scoping: a topic, # General; the header title follows; a file scope is dropped first", async () => {
  const w = fakeWindow();
  await T.fetchTopics(w);
  assert.equal(T.headerTitle(w), `# ${en.GENERAL}`);
  w._scopedFileNid = "f9";
  await T.scopeChatToTopic(w, "t1");
  assert.ok(w.calls.findIndex((c) => c[0] === "file" && c[1] === null) < w.calls.findIndex((c) => c[0] === "topic"));
  assert.equal(w.chat.scopedTopicId, "t1");
  assert.equal(T.headerTitle(w), "# 💰 Budget");
  assert.deepEqual(w.calls.filter((c) => c[0] === "header").at(-1), ["header", null, "", true]);
  await T.scopeChatToTopic(w, null);
  assert.equal(T.menuOpts(w).topicId, "general");
  assert.equal(w.chat.scopedTopicId, "general");
  // "all" (the Files-tab All tab) is a real scope; the Chat-tab title reads
  // # General for it (the rail has no All row).
  w._topicId = "all";
  assert.equal(T.menuOpts(w).topicId, "all");
  assert.equal(T.headerTitle(w), `# ${en.GENERAL}`);
  const f = fakeWindow({ tab: "files" });
  await T.scopeChatToTopic(f, "general");
  assert.deepEqual(f.calls.filter((c) => c[0] === "header").at(-1), ["header", null, "", false]);
});

test("folder change → all, and the topics are forgotten", async () => {
  const w = fakeWindow();
  await T.fetchTopics(w);
  await T.scopeChatToTopic(w, "t1");
  await T.onFolderChange(w);
  assert.equal(T.menuOpts(w).topicId, "all");
  assert.deepEqual(T.menuOpts(w).topics, []);
  assert.equal(w.chat.scopedTopicId, "all");
});

test("the folder skeleton builds the topic-dialog slot in both shapes", () => {
  for (const headless of [1, 0]) {
    const ui = { fig: { family: "window-folder", group: "window" }, mget: (k) => (k === "headless" ? headless : undefined) };
    const main = grid(ui);
    const slot = main.kids.find((k) => k && k.name === "topic-dialog");
    assert.ok(slot, `headless=${headless}`);
    assert.match(slot.className, /widget-topic-create__viewport-backdrop/);
  }
});

// Opening a topic reads it (channel.messages marks it read server-side); the
// rail repaints from its cached rows, so the badge must clear with it.
test("opening a topic clears its badge in the rail's rows", async () => {
  const w = fakeWindow();
  await T.fetchTopics(w);
  assert.equal(T.menuOpts(w).topics[0].unread, 2);
  await T.scopeChatToTopic(w, "t1");
  assert.equal(T.menuOpts(w).topics[0].unread, 0);
});
