// chat-topic-scope.test.js — widget_chat scoped to a folder chat topic:
// "all" (default, the whole folder chat), "general" (no topic) or a topic id.
// The list, the post payload and the realtime match all follow the scope.
//
//   node --test tests/chat-topic-scope.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const Module = require("node:module");

const WIDGET = path.join(__dirname, "..", "src/drumee/builtins/widget/chat");
const STUBS = {
  "@drumee/ui-essentials": {},
  "./node-icon": () => "",
  "./skin": {},
  "libs/hub-home": require(path.join(__dirname, "..", "src/drumee/libs/hub-home.js")),
};
const load = Module._load;
Module._load = function (request, parent, isMain) {
  if (Object.prototype.hasOwnProperty.call(STUBS, request)) return STUBS[request];
  return load.call(this, request, parent, isMain);
};
const lex = require(path.join(__dirname, "..", "src/drumee/lex/attribute.js"));
global._ = require("underscore");
global._a = new Proxy(lex, { get: (t, k) => (k in t ? t[k] : k) });
global._e = new Proxy({}, { get: (t, k) => k });
global.SERVICE = { channel: { messages: "channel.messages", post: "channel.post" }, chat: { messages: "chat.messages" } };
global.Visitor = { id: "ME" };
global.LetcBox = class {};
const Chat = require(WIDGET);

function chat(topic) {
  const w = Object.create(Chat.prototype);
  const model = { area: "private" };
  const restarted = [];
  Object.assign(w, {
    hubId: "H1",
    mget: (k) => model[k],
    mset: (k, v) => { model[k] = v; },
    getScopedNid: () => "fA",
    getPostNid: () => "fA",
    ensurePart: () => Promise.resolve({ restart() { restarted.push(1); }, mget() {}, mset() {}, once() {} }),
    restarted,
  });
  if (topic) w.scopedTopicId = topic;
  return w;
}
const msg = (meta, nid = "fA") => ({ nid, metadata: meta == null ? null : JSON.stringify(meta) });

test("getCurrentApi adds topic_id only when the scope is not all", () => {
  assert.equal(chat().getCurrentApi().topic_id, undefined);
  assert.equal(chat("all").getCurrentApi().topic_id, undefined);
  assert.equal(chat("general").getCurrentApi().topic_id, "general");
  const api = chat("t1").getCurrentApi();
  assert.equal(api.topic_id, "t1");
  assert.equal(api.nid, "fA");
  assert.equal(api.service, "channel.messages");
});

test("post payload: topic_id for a topic id, nothing for all / general", () => {
  assert.deepEqual(chat("t1")._withTopic({ service: "channel.post" }), { service: "channel.post", topic_id: "t1" });
  assert.deepEqual(chat("general")._withTopic({ service: "channel.post" }), { service: "channel.post" });
  assert.deepEqual(chat()._withTopic({ service: "channel.post" }), { service: "channel.post" });
});

test("realtime: a topic message lands only in its topic and All", () => {
  const inTopic = msg({ _scope_nid: "fA", _topic_id: "t1" });
  const plain = msg({ _scope_nid: "fA" });
  assert.equal(chat("t1").matchesScopedChannel(inTopic), true);
  assert.equal(chat("all").matchesScopedChannel(inTopic), true);
  assert.equal(chat().matchesScopedChannel(inTopic), true);
  assert.equal(chat("general").matchesScopedChannel(inTopic), false);
  assert.equal(chat("t2").matchesScopedChannel(inTopic), false);
  assert.equal(chat("all").matchesScopedChannel(plain), true);
  assert.equal(chat("general").matchesScopedChannel(plain), true);
  assert.equal(chat("t1").matchesScopedChannel(plain), false);
  // metadata as an object (in-client echo) and the folder rule still applies.
  assert.equal(chat("t1").matchesScopedChannel({ nid: "fA", metadata: { _topic_id: "t1" } }), true);
  assert.equal(chat("t1").matchesScopedChannel(msg({ _topic_id: "t1" }, "fB")), false);
});

test("setScopedTopic restarts the list once per change", async () => {
  const w = chat();
  w.setScopedTopic("t1");
  await new Promise((r) => setImmediate(r));
  assert.equal(w.scopedTopicId, "t1");
  assert.equal(w.restarted.length, 1);
  w.setScopedTopic("t1");
  await new Promise((r) => setImmediate(r));
  assert.equal(w.restarted.length, 1);
  w.setScopedTopic(null);
  await new Promise((r) => setImmediate(r));
  assert.equal(w.scopedTopicId, "all");
  assert.equal(w.restarted.length, 2);
});

// Review: the desk team chat is one conversation for the whole workspace
// (scopedNid ""), so a topic's list must still name the folder the topic
// belongs to — the post folder — or the server answers [].
test("workspace team chat: a topic list names the post folder", () => {
  const w = chat("t1");
  w.getScopedNid = () => "";
  w.getPostNid = () => "fA";
  const api = w.getCurrentApi();
  assert.equal(api.topic_id, "t1");
  assert.equal(api.nid, "fA");
  const all = chat("all");
  all.getScopedNid = () => "";
  all.getPostNid = () => "fA";
  assert.equal(all.getCurrentApi().nid, undefined, "All / General keep the whole workspace chat");
});

// Review: reads go through channel.acknowledge (read on interaction); in a
// topic it must carry topic_id and must not announce the workspace chat read.
test("reading inside a topic acknowledges with topic_id and does not clear the workspace pill", () => {
  const mk = (topic) => {
    const w = chat(topic);
    w.posted = [];
    w.announced = 0;
    Object.assign(w, {
      el: { dataset: {} },
      __list: { children: { last: () => ({ model: { toJSON: () => ({ message_id: "m9" }) } }) } },
      postService: (p) => w.posted.push(p),
      _clearUnreadRows() {},
      _announceChatRead() { w.announced++; },
    });
    return w;
  };
  const t = mk("t1");
  t.markConversationRead();
  assert.equal(t.posted[0].topic_id, "t1");
  assert.equal(t.posted[0].message_id, "m9");
  assert.equal(t.announced, 0);
  const a = mk("all");
  a.markConversationRead();
  assert.equal(a.posted[0].topic_id, undefined);
  assert.equal(a.announced, 1);
});

test("mounts on general when the descriptor says so; a chat mounted without scoped_topic stays all", () => {
  const w = Object.create(Chat.prototype);
  const attrs = { scoped_topic: "general" };
  w.mget = (k) => attrs[k];
  assert.equal(w._initialTopic(), "general");
  const inbox = Object.create(Chat.prototype);
  inbox.mget = () => undefined;
  assert.equal(inbox._initialTopic(), "all");
});

test("the folder chat descriptor opens on All (scoped_topic), folder window only", () => {
  const src = require("node:fs").readFileSync(path.join(__dirname, "..", "src/drumee/builtins/window/skeleton/toolkit/index.js"), "utf8");
  const i = src.indexOf('sys_pn: "folder-chat"');
  assert.ok(i > 0);
  const block = src.slice(src.lastIndexOf("{", i), src.indexOf("};", i));
  // Only the folder window has a Topics picker: shares, team and website
  // windows (and the DMZ sharebox) reach this descriptor too and must keep
  // the whole chat ("all"), or topic messages vanish with no way to them.
  assert.match(block, /ui\.fig\.family === "window-folder"[^\n]*scoped_topic: "all"/);
  assert.doesNotMatch(block, /^\s*scoped_topic: "[a-z]+",$/m);
});
