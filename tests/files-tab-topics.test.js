// files-tab-topics.test.js — the Files-tab chat's topic strip and File
// threads bar, wired to the folder window (window/folder/topics.js +
// window/folder/file-threads-bar.js). Fake window, as folder-topics.test.js.
//
//   node --test tests/files-tab-topics.test.js
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
const listeners = {};
global.document = {
  addEventListener: (t, f) => ((listeners[t] = listeners[t] || new Set()).add(f)),
  removeEventListener: (t, f) => listeners[t] && listeners[t].delete(f),
};
const fire = (t, e) => [...(listeners[t] || [])].forEach((f) => f(e));
// The UI-test mock topics are off here: these tests pin the real list.
const _loadMockOff = require("node:module")._load;
require("node:module")._load = function (r, ...a) {
  if (r === "./topics-mock") return { withMockTopics: (rows) => rows };
  return _loadMockOff.call(this, r, ...a);
};
const T = require("../src/drumee/builtins/window/folder/topics");
const FT = require("../src/drumee/builtins/window/folder/file-threads-bar");
const flush = () => new Promise((r) => setImmediate(r));
const walk = (n, out = []) => { if (Array.isArray(n)) { n.forEach((k) => walk(k, out)); return out; } if (!n || typeof n !== "object") return out; out.push(n); (n.kids || []).forEach((k) => walk(k, out)); return out; };

function fakeWindow({ canChat = true, tab = "files", token = "", threads = [{ file_nid: "f1", filename: "Q2" }] } = {}) {
  const calls = [];
  const parts = {};
  const mk = (pn) => (parts[pn] = parts[pn] || { pn, el: { dataset: {}, contains: (x) => x === "inside" }, fed: [], feed(k) { this.fed.push(k); } });
  const chat = { scopedTopicId: "general", setScopedTopic(t) { calls.push(["topic", t]); this.scopedTopicId = t; } };
  return {
    calls, parts, chat,
    fig: { group: "window", family: "window-folder" },
    activeTab: tab,
    _isCompactChat: () => false,
    mget: (k) => ({ hub_id: "h1", actual_hub_id: "hA", nid: "fA", privilege: canChat ? 7 : 3, token })[k],
    _privilegeGrantsChat: () => canChat,
    ensurePart: (pn) => Promise.resolve(pn === "folder-chat" ? chat : mk(pn)),
    fetchService: async (args) => (calls.push(["fetch", args]), [{ id: "t1", name: "Topic name", emoji: "😀" }]),
    postService: async () => ({ id: "t9", folder_nid: "fA", name: "Design", emoji: "🔥" }),
    _fetchThreadList: async () => (calls.push(["threads"]), threads),
    _closeThreadMenu() {},
    _setThreadRailActive(n) { calls.push(["railActive", n]); },
    _updateChatHeader(f, l, g) { calls.push(["header", f, l, g]); },
    scopeChatToFile(n, l) { calls.push(["file", n, l]); this._scopedFileNid = n ? `${n}` : ""; },
  };
}
// The strip is a carousel: its tabs sit inside the __topic-page box.
const pageOfStrip = (kids) => kids.find((k) => /__topic-page\b/.test(k.className || "")) || { kids: [] };
const services = (kids) => pageOfStrip(kids).kids.map((k) => k.service).concat(kids.filter((k) => k.service === "topic-new").map((k) => k.service));
const active = (kids) => pageOfStrip(kids).kids.filter((k) => k.dataset && k.dataset.active === "1").map((k) => k.service + (k.topic_id ? `:${k.topic_id}` : ""));

test("files tab: the strip paints #General active with the folder's topics; tabs scope the chat and the rail", async () => {
  const w = fakeWindow();
  await T.refreshStrip(w);
  const strip = w.parts["topic-strip"].fed.at(-1);
  assert.deepEqual(services(strip), ["thread-menu-general", "topic-menu-topic", "topic-new"]);
  assert.deepEqual(active(strip), ["thread-menu-general"]);
  await T.scopeChatToTopic(w, "t1");
  assert.deepEqual(active(w.parts["topic-strip"].fed.at(-1)), ["topic-menu-topic:t1"]);
  assert.equal(w.chat.scopedTopicId, "t1");
  assert.ok(w.calls.some((c) => c[0] === "railActive"));
  await T.scopeChatToTopic(w, "general");
  assert.deepEqual(active(w.parts["topic-strip"].fed.at(-1)), ["thread-menu-general"]);
  // The Files-tab header keeps "Team Chat": the strip shows the scope.
  assert.deepEqual(w.calls.filter((c) => c[0] === "header").at(-1), ["header", null, "", false]);
});

test("no All anywhere: a legacy all scope reads as #General; tab switches keep the scope", async () => {
  const w = fakeWindow();
  w._topicId = "all";
  assert.equal(T.menuOpts(w).topicId, "general");
  await T.scopeChatToTopic(w, "t1");
  w.calls.length = 0;
  await T.onChatTabEnter(w);
  await T.onFilesTabEnter(w);
  assert.ok(!w.calls.some((c) => c[0] === "topic"), "switching tabs never re-scopes");
  assert.equal(w.chat.scopedTopicId, "t1");
});

test("+ Create topic: after create the strip shows the new topic active", async () => {
  const w = fakeWindow();
  await T.refreshStrip(w);
  const r = await T.createTopic(w, { name: "Design", emoji: "🔥" });
  assert.equal(r.ok, true);
  assert.deepEqual(active(w.parts["topic-strip"].fed.at(-1)), ["topic-menu-topic:t9"]);
});

test("file threads bar: toggle opens the list; a row closes it (the row scopes the chat in index.js)", async () => {
  const w = fakeWindow();
  await FT.paint(w);
  assert.equal(w.parts["ft-bar"].fed.at(-1)[0].dataset.open, "0");
  await FT.toggle(w);
  const open = w.parts["ft-bar"].fed.at(-1);
  assert.equal(open[0].dataset.open, "1");
  assert.equal(w.parts["ft-bar"].el.dataset.open, "1");
  assert.deepEqual(walk(open).filter((n) => n.service === "thread-menu-file").map((n) => n.file_nid), ["f1"]);
  await FT.close(w);
  assert.equal(w.parts["ft-bar"].el.dataset.open, "0");
  assert.equal(w.parts["ft-bar"].fed.at(-1).length, 1);
});

test("the bar closes on outside click and on Escape, not on a click inside", async () => {
  const w = fakeWindow();
  await FT.toggle(w);
  fire("pointerdown", { target: "inside" });
  await flush();
  assert.equal(w.parts["ft-bar"].el.dataset.open, "1");
  fire("pointerdown", { target: "elsewhere" });
  await flush();
  assert.equal(w.parts["ft-bar"].el.dataset.open, "0");
  await FT.toggle(w);
  fire("keydown", { key: "Escape" });
  await flush();
  assert.equal(w.parts["ft-bar"].el.dataset.open, "0");
  assert.equal((listeners.pointerdown || new Set()).size, 0, "listeners removed");
});

test("folder change repaints the strip (scope back to #General) and closes the bar", async () => {
  const w = fakeWindow();
  await T.refreshStrip(w);
  await T.scopeChatToTopic(w, "t1");
  await FT.toggle(w);
  await T.onFolderChange(w);
  await FT.onFolderChange(w);
  assert.equal(w.chat.scopedTopicId, "general");
  assert.deepEqual(active(w.parts["topic-strip"].fed.at(-1)), ["thread-menu-general"]);
  assert.equal(w.parts["ft-bar"].el.dataset.open, "0");
});

test("no strip / bar content for a chat-gated viewer or a token window", async () => {
  for (const w of [fakeWindow({ canChat: false }), fakeWindow({ token: "tok" })]) {
    await T.refreshStrip(w);
    await FT.paint(w);
    assert.deepEqual(w.parts["topic-strip"].fed.at(-1), []);
    assert.deepEqual(w.parts["ft-bar"].fed.at(-1), []);
  }
});

// Carousel: the page follows the scope, the arrows move it, a folder change
// goes back to the first page.
test("carousel: next / back move the page; picking a topic shows its page; folder change → page 0", async () => {
  const w = fakeWindow();
  w.fetchService = async () => ["a", "b", "c", "d", "e"].map((x, i) => ({ id: `t${i + 1}`, name: x, emoji: "😀" }));
  await T.refreshStrip(w);
  const ids = () => pageOfStrip(w.parts["topic-strip"].fed.at(-1)).kids.map((k) => k.topic_id || k.service);
  assert.deepEqual(ids(), ["thread-menu-general", "t1", "t2"]);
  await T.stripPage(w, +1);
  assert.deepEqual(ids(), ["t3", "t4", "t5"]);
  await T.stripPage(w, +1); // already last
  assert.deepEqual(ids(), ["t3", "t4", "t5"]);
  await T.stripPage(w, -1);
  assert.deepEqual(ids(), ["thread-menu-general", "t1", "t2"]);
  await T.scopeChatToTopic(w, "t5");
  assert.deepEqual(ids(), ["t3", "t4", "t5"]);
  await T.onFolderChange(w);
  await T.refreshStrip(w);
  assert.deepEqual(ids(), ["thread-menu-general", "t1", "t2"]);
});
