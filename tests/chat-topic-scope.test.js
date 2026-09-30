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
