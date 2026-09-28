// Workspace unread indicators: the rail's Chat / Task / Meet pills and the
// team chat that is only glanced at in the Files side column.
//
// 1. panel/activity/hub-counts — per-workspace counts built from the rows the
//    panel already fetched (pure function, no stubs).
// 2. widget_chat — a team chat (read_on_interaction) must not be read by a
//    focus the user did not ask for (autofocus / window re-focus), lights its
//    unread rows, and clears them + tells the desk when it IS read.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const Module = require("node:module");

const SRC = path.join(__dirname, "..", "src/drumee");
const { hubCounts, kindOfRow, hubOfRow, latestTime } = require(path.join(SRC, "builtins/panel/activity/hub-counts.js"));

// ── 1. hub-counts ────────────────────────────────────────────────────

test("hub counts: team chat sums the unread messages of every folder rollup", () => {
  const c = hubCounts([
    { category: "teamchat", hub_id: "H1", nid: null, cnt: "2" },
    { category: "teamchat", hub_id: "H1", nid: "F1", cnt: "3" },
    { category: "teamchat", hub_id: "H2", nid: null, cnt: 1 },
  ]);
  assert.deepEqual(c.H1, { chat: 5, task: 0, meeting: 0 });
  assert.deepEqual(c.H2, { chat: 1, task: 0, meeting: 0 });
});

test("hub counts: assigned, mentioned/replied and watched-column rows are one task each", () => {
  const c = hubCounts([
    { category: "contact_invite", event: "task_assigned", task_hub_id: "H1", key_id: "1" },
    { category: "contact_invite", event: "task_mention", hub_id: "H1", key_id: "2" },
    { category: "contact_invite", event: "task_column_change", task_hub_id: "H1", key_id: "3" },
    { category: "contact_invite", event: "task_assigned", task_hub_id: "H2", key_id: "4" },
  ]);
  assert.equal(c.H1.task, 3);
  assert.equal(c.H2.task, 1);
});

test("hub counts: a meeting invitation (or its move) counts, a cancellation does not", () => {
  const c = hubCounts([
    { category: "contact_invite", event: "meeting_notice", meeting_kind: "invite", meeting_hub_id: "H1" },
    { category: "contact_invite", event: "meeting_notice", meeting_kind: "moved", meeting_hub_id: "H1" },
    { category: "contact_invite", event: "meeting_notice", meeting_kind: "cancelled", meeting_hub_id: "H1" },
  ]);
  assert.equal(c.H1.meeting, 2);
});

test("hub counts: files, DMs, access requests and rows with no workspace are ignored", () => {
  const c = hubCounts([
    { category: "media", event: "media.new", hub_id: "H1", cnt: "12" },
    { category: "chat", drumate_id: "P1", cnt: "4" },
    { category: "access_request", key_id: "9" },
    { category: "contact_invite", event: "task_assigned", key_id: "5" },
    { category: "teamchat", cnt: "3" },
    null,
  ]);
  assert.deepEqual(c, {});
  assert.deepEqual(hubCounts(undefined), {});
  assert.equal(kindOfRow({ category: "media" }), null);
  assert.equal(hubOfRow({ event: "task_mention", hub_id: "H3" }), "H3");
});

test("opening Task / Meet clears the pill; only a newer (or refreshed) row counts again", () => {
  const rows = [
    { category: "contact_invite", event: "task_assigned", task_hub_id: "H1", key_id: "1", timestamp: 100 },
    { category: "contact_invite", event: "task_mention", hub_id: "H1", key_id: "2", ctime: 150 },
    { category: "contact_invite", event: "meeting_notice", meeting_kind: "invite", meeting_hub_id: "H1", key_id: "3", timestamp: 120 },
    { category: "teamchat", hub_id: "H1", cnt: "2" },
  ];
  assert.deepEqual(hubCounts(rows), { H1: { chat: 2, task: 2, meeting: 1 } });
  // The user opens Task: what is there now is seen.
  const seen = { H1: { task: latestTime(rows, "H1", "task") } };
  assert.equal(seen.H1.task, 150, "server time, the newest of that tab's rows");
  assert.deepEqual(hubCounts(rows, seen).H1, { chat: 2, task: 0, meeting: 1 }, "only Task clears; chat untouched");
  // A new task is created afterwards.
  rows.push({ category: "contact_invite", event: "task_assigned", task_hub_id: "H1", key_id: "4", timestamp: 200 });
  assert.equal(hubCounts(rows, seen).H1.task, 1);
  // The server refreshes an old row in place (dedupe): its new time counts.
  rows[0].timestamp = 210;
  assert.equal(hubCounts(rows, seen).H1.task, 2);
  // Another workspace is not affected by H1's mark.
  rows.push({ category: "contact_invite", event: "task_assigned", task_hub_id: "H2", key_id: "5", timestamp: 50 });
  assert.equal(hubCounts(rows, seen).H2.task, 1);
  assert.equal(latestTime(rows, "H9", "task"), 0);
});

// ── 2. widget_chat ───────────────────────────────────────────────────

const STUBS = {
  "@drumee/ui-essentials": {},
  "./node-icon": () => "",
  "./skin": {},
  "libs/hub-home": require(path.join(SRC, "libs/hub-home.js")),
};
const load = Module._load;
Module._load = function (request, parent, isMain) {
  if (Object.prototype.hasOwnProperty.call(STUBS, request)) return STUBS[request];
  return load.call(this, request, parent, isMain);
};

const lex = require(path.join(SRC, "lex/attribute.js"));
global._ = require("underscore");
global._a = new Proxy(lex, { get: (t, k) => (k in t ? t[k] : k) });
global._e = new Proxy({}, { get: (t, k) => k });
global.SERVICE = {
  chat: { post: "chat.post", acknowledge: "chat.acknowledge", forward: "chat.forward" },
  channel: { post: "channel.post", acknowledge: "channel.acknowledge", post_ticket: "channel.post_ticket" },
  contact: { block: "contact.block", unblock: "contact.unblock" },
  media: { home: "media.home" },
};
global.Visitor = { id: "ME" };
global.LetcBox = class {};
global.requestAnimationFrame = (fn) => fn();
const broadcasts = [];
global.RADIO_BROADCAST = { trigger: (ev, a) => broadcasts.push([ev, a]) };

const Chat = require(path.join(SRC, "builtins/widget/chat"));

// A row of the conversation, as the list holds it.
function row(data) {
  return { el: { dataset: {} }, model: { toJSON: () => data } };
}

function teamChat({ inView = false, area = "share", readOnInteraction = true, rows = [] } = {}) {
  const posts = [];
  const w = Object.create(Chat.prototype);
  const model = { area };
  const lit = () => rows.filter((r) => r.el.dataset.unread === "1").length;
  Object.assign(w, {
    el: {
      dataset: {},
      style: {},
      addEventListener() {},
      removeEventListener() {},
      querySelectorAll: () => rows.filter((r) => r.el.dataset.unread === "1").map((r) => r.el),
    },
    hubId: "HUB",
    peerId: "",
    _readOnInteraction: readOnInteraction,
    mget: (k) => model[k],
    getHandlers: () => [{}],
    getScopedNid: () => "",
    postService: (p) => posts.push(p),
    handleReceivedMsg() {},
    _removeTyper() {},
    matchesScopedChannel: () => true,
    isDestroyed: () => false,
    _isInReadingView: () => inView,
    __list: {
      getItemsByAttr: (k, v) => rows.filter((r) => r.model.toJSON()[k] === v),
      children: {
        last: () => ({ model: { toJSON: () => ({ message_id: "M9" }) } }),
        each: (fn) => rows.forEach(fn),
      },
    },
  });
  return { w, posts, rows, lit };
}

test("team chat: autofocus / window re-focus of the composer does NOT read the conversation", () => {
  const { w, posts } = teamChat({ inView: false });
  w.onUiEvent({ get: () => "input-focus", mget: () => "input-focus" }, { service: "input-focus" });
  assert.equal(posts.length, 0, "Files side column: focus is not reading");
});

test("team chat: composer focus while its Chat tab is on screen still reads", () => {
  const { w, posts } = teamChat({ inView: true });
  w.onUiEvent({ get: () => "input-focus", mget: () => "input-focus" }, { service: "input-focus" });
  assert.equal(posts.length, 1);
  assert.equal(posts[0].service, "channel.acknowledge");
});

test("other chats: composer focus keeps marking read as before", () => {
  const { w, posts } = teamChat({ inView: false, readOnInteraction: false });
  w.onUiEvent({ get: () => "input-focus", mget: () => "input-focus" }, { service: "input-focus" });
  assert.equal(posts.length, 1);
});

test("team chat: unread rows light up on load, only someone else's and only if I have not seen them", () => {
  const rows = [
    row({ message_id: "A", author_id: "P1", metadata: JSON.stringify({ _seen_: { P1: 1, ME: 1 } }) }),
    row({ message_id: "B", author_id: "ME", metadata: JSON.stringify({ _seen_: { ME: 1 } }) }),
    row({ message_id: "C", author_id: "P1", metadata: JSON.stringify({ _seen_: { P1: 1 } }) }),
    row({ message_id: "D", author_id: "P2", metadata: { _seen_: {} } }),
  ];
  const { w, lit } = teamChat({ rows });
  w._markUnreadRows();
  assert.deepEqual(rows.map((r) => r.el.dataset.unread || "0"), ["0", "0", "1", "1"]);
  assert.equal(lit(), 2);
});

test("team chat: a message arriving in the side column is lit, and replying clears it + tells the desk", () => {
  const rows = [row({ message_id: "M9", author_id: "P1" })];
  const { w, posts, lit } = teamChat({ inView: false, rows });
  broadcasts.length = 0;
  w.onWsMessage("live.update", { hub_id: "HUB", message_id: "M9", author_id: "P1" }, { service: "channel.post" });
  assert.equal(posts.length, 0);
  assert.equal(lit(), 1, "lit until read");
  w._onReadGesture();
  assert.equal(posts.length, 1);
  assert.equal(lit(), 0, "cleared on read");
  assert.deepEqual(broadcasts, [["workspace-chat-read", { hub_id: "HUB" }]]);
});

test("a DM never lights rows nor announces a workspace read", () => {
  const rows = [row({ message_id: "M9", author_id: "P1" })];
  const { w, posts, lit } = teamChat({ area: "privateRoom", readOnInteraction: false, rows });
  w.peerId = "P1";
  broadcasts.length = 0;
  w._markUnreadRows();
  w.markConversationRead();
  assert.equal(lit(), 0);
  assert.equal(posts.length, 1);
  assert.equal(posts[0].service, "chat.acknowledge", "a DM read is unchanged");
  assert.deepEqual(broadcasts, []);
});
