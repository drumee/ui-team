// widget_chat park / unpark — the contract chat_p2p relies on to keep the
// other scope tab's conversation mounted but hidden. The class is real; each
// test drives its methods on a bare instance with the collaborators stubbed.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const Module = require("node:module");

const WIDGET = path.join(__dirname, "..", "src/drumee/builtins/widget/chat");

const STUBS = {
  "@drumee/ui-essentials": {},
  "./node-icon": () => "",
  "./skin": {},
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
global.SERVICE = {
  chat: { post: "chat.post", acknowledge: "chat.acknowledge", forward: "chat.forward" },
  channel: { post: "channel.post", acknowledge: "channel.acknowledge", post_ticket: "channel.post_ticket" },
  contact: { block: "contact.block", unblock: "contact.unblock" },
  media: { home: "media.home" },
};
global.Visitor = { id: "ME" };
global.LetcBox = class {};

const Chat = require(WIDGET);

// A private (DM) conversation with peer P1, painted, one message loaded.
function chat() {
  const posts = [];
  const received = [];
  const w = Object.create(Chat.prototype);
  const model = { area: "privateRoom" };
  Object.assign(w, {
    el: { dataset: {}, style: {} },
    hubId: "ME",
    peerId: "P1",
    mget: (k) => model[k],
    mset: (k, v) => { model[k] = v; },
    getHandlers: () => [{ isHidden: () => false }],
    postService: (p) => posts.push(p),
    handleReceivedMsg: (d) => received.push(d),
    _removeTyper() {},
    matchesScopedChannel: () => true,
    scrollMessagesToBottom() { this.scrolled = (this.scrolled || 0) + 1; },
    __list: {
      __container: { scrollTop: 0 },
      children: { last: () => ({ model: { toJSON: () => ({ ctime: 42 }) } }) },
    },
  });
  return { w, posts, received };
}

const post = (w, data) => w.onWsMessage("live.update", data, { service: "chat.post" });

test("a visible conversation acknowledges an incoming message on receipt", () => {
  const { w, posts } = chat();
  post(w, { peer_id: "P1", author_id: "P1", ctime: 42 });
  assert.equal(posts.length, 1);
  assert.equal(posts[0].service, "chat.acknowledge");
});

test("a parked conversation still receives the message but does not acknowledge it", () => {
  const { w, posts, received } = chat();
  w.park();
  post(w, { peer_id: "P1", author_id: "P1", ctime: 42 });
  assert.equal(received.length, 1, "stays current while hidden");
  assert.equal(posts.length, 0, "nobody has seen it");
  assert.equal(w.el.style.display, "none");
});

test("unpark pays the held ack once, as a read-up-to-latest", () => {
  const { w, posts } = chat();
  w.park();
  post(w, { peer_id: "P1", author_id: "P1", ctime: 42 });
  post(w, { peer_id: "P1", author_id: "P1", ctime: 43 });
  w.unpark();
  assert.equal(posts.length, 1);
  assert.deepEqual(posts[0], { hub_id: "ME", service: "chat.acknowledge", peer_id: "P1", ref_ctime: 42 });
  assert.equal(w.el.style.display, "");
  w.park();
  w.unpark();
  assert.equal(posts.length, 1, "nothing new arrived, nothing to ack");
});

test("unpark with nothing received sends nothing", () => {
  const { w, posts } = chat();
  w.park();
  w.unpark();
  assert.equal(posts.length, 0);
});

test("own messages and other peers' messages never create an ack debt", () => {
  const { w, posts } = chat();
  w.park();
  post(w, { peer_id: "P1", author_id: "ME", ctime: 42 });
  post(w, { peer_id: "P2", author_id: "P2", ctime: 42 });
  w.unpark();
  assert.equal(posts.length, 0);
});

test("markConversationRead (input focus, workspace click) is a no-op while parked", () => {
  const { w, posts } = chat();
  w.park();
  w.markConversationRead();
  assert.equal(posts.length, 0);
});

test("unpark restores the reading position, or re-pins to the bottom", () => {
  const a = chat().w;
  a._pinnedToBottom = false;
  a.__list.__container.scrollTop = 300;
  a.park();
  a.__list.__container.scrollTop = 0; // display:none dropped it
  a.unpark();
  assert.equal(a.__list.__container.scrollTop, 300);

  const b = chat().w;
  b._pinnedToBottom = true;
  b.park();
  b.unpark();
  assert.equal(b.scrolled, 1);
});

test("onDomRefresh uses a prefetched media.home instead of refetching it", async () => {
  const { w } = chat();
  const fetched = [];
  let fed = 0;
  w.fetchService = async (o) => { fetched.push(o); return {}; };
  w.clear_notifications = () => {};
  w.feed = () => { fed++; };
  w._bindMentionKeyboard = w._bindClipboardPaste = w._installMediaDroppable = () => {};
  w.isDestroyed = () => false;
  w.mset("prefetched_home", { home_id: "H", chat_upload_id: "U" });
  // skeleton require would pull the whole UI; it is not what is under test.
  const skl = require.resolve(path.join(WIDGET, "skeleton"));
  require.cache[skl] = { id: skl, filename: skl, loaded: true, exports: () => ({}) };
  w.onDomRefresh();
  await new Promise((r) => setTimeout(r, 0));
  clearTimeout(w._paintedFallback);
  assert.equal(fetched.length, 0);
  assert.equal(w.mget("nid"), "U");
  assert.equal(fed, 1);
});

test("onDomRefresh without a prefetch still fetches media.home (other callers)", async () => {
  const { w } = chat();
  const fetched = [];
  w.fetchService = async (o) => { fetched.push(o); return { chat_upload_id: "U2" }; };
  w.clear_notifications = () => {};
  w.feed = () => {};
  w._bindMentionKeyboard = w._bindClipboardPaste = w._installMediaDroppable = () => {};
  w.isDestroyed = () => false;
  w.onDomRefresh();
  await new Promise((r) => setTimeout(r, 0));
  clearTimeout(w._paintedFallback);
  assert.equal(fetched.length, 1);
  assert.equal(fetched[0].service, "media.home");
  assert.equal(w.mget("nid"), "U2");
});

// ── Workspace team chat: read only when actually read ────────────────
// (read_on_interaction, set by window/skeleton/toolkit chatPanel)
global.requestAnimationFrame = (fn) => fn();

function teamChat({ inView = false } = {}) {
  const posts = [];
  const w = Object.create(Chat.prototype);
  const model = { area: "share" };
  const listeners = {};
  Object.assign(w, {
    el: {
      dataset: {},
      style: {},
      addEventListener: (ev, fn) => { listeners[ev] = fn; },
      removeEventListener: (ev) => { delete listeners[ev]; },
    },
    hubId: "HUB",
    peerId: "",
    _readOnInteraction: true,
    mget: (k) => model[k],
    getHandlers: () => [{}], // a window_folder: no isHidden at all
    getScopedNid: () => "",
    postService: (p) => posts.push(p),
    handleReceivedMsg() {},
    _removeTyper() {},
    matchesScopedChannel: () => true,
    isDestroyed: () => false,
    _isInReadingView: () => inView,
    __list: {
      children: { last: () => ({ model: { toJSON: () => ({ message_id: "M9" }) } }) },
    },
  });
  w._onReadGesture = Chat.prototype._onReadGesture.bind(w);
  w._bindReadGesture();
  const click = () => listeners.pointerdown && listeners.pointerdown();
  return { w, posts, click, setInView: (v) => { inView = v; } };
}
const channelPost = (w, data) =>
  w.onWsMessage("live.update", { hub_id: "HUB", message_id: "M9", ...data }, { service: "channel.post" });

test("team chat: a message arriving while the chat is not in front is NOT acknowledged", () => {
  const { w, posts } = teamChat({ inView: false });
  channelPost(w, { author_id: "P1" });
  assert.equal(posts.length, 0, "Files side column / Task tab / covered window");
  assert.equal(w._readDebt, true);
});

test("team chat: a click in the chat pays the debt once", () => {
  const { w, posts, click } = teamChat({ inView: false });
  channelPost(w, { author_id: "P1" });
  click();
  assert.equal(posts.length, 1);
  assert.equal(posts[0].service, "channel.acknowledge");
  assert.equal(posts[0].message_id, "M9");
  click();
  assert.equal(posts.length, 1, "nothing owed, nothing sent");
});

test("team chat: a message arriving while its Chat tab is on screen is acknowledged", () => {
  const { w, posts } = teamChat({ inView: true });
  channelPost(w, { author_id: "P1" });
  assert.equal(posts.length, 1);
});

test("team chat: raising the workspace / entering a folder does not read it unless it is on screen", () => {
  const off = teamChat({ inView: false });
  off.w._onReadContext({ hub_id: "HUB" });
  assert.equal(off.posts.length, 0);
  const on = teamChat({ inView: true });
  on.w._onReadContext({ hub_id: "HUB" });
  assert.equal(on.posts.length, 1);
});

test("team chat: loading the history asks the server not to mark it read", () => {
  const { w } = teamChat();
  w.scopedFileNid = "";
  assert.equal(w.getCurrentApi().mark_read, 0);
  const plain = Object.create(Chat.prototype);
  Object.assign(plain, { hubId: "HUB", mget: (k) => ({ area: "share" })[k], getScopedNid: () => "" });
  assert.equal(plain.getCurrentApi().mark_read, undefined, "other chats unchanged");
});

test("other chats keep marking read on workspace raise", () => {
  const { w, posts } = chat();
  w.hubId = "HUB";
  w._onReadContext({ hub_id: "HUB" });
  assert.equal(posts.length, 1);
});

test("_isInReadingView: only the Chat tab, on screen, visible page, not covered", () => {
  const body = { dataset: { view: "chat" } };
  const inside = {};
  const w = Object.create(Chat.prototype);
  w.el = {
    isConnected: true,
    closest: () => body,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }),
    contains: (n) => n === inside,
  };
  let hit = inside;
  global.document = { visibilityState: "visible", elementFromPoint: () => hit };
  assert.equal(w._isInReadingView(), true);
  body.dataset.view = "files";
  assert.equal(w._isInReadingView(), false, "Files side column is a glance");
  body.dataset.view = "chat";
  hit = {};
  assert.equal(w._isInReadingView(), false, "covered by a section screen / modal");
  hit = inside;
  global.document.visibilityState = "hidden";
  assert.equal(w._isInReadingView(), false, "background browser tab");
  global.document.visibilityState = "visible";
  w.el.getBoundingClientRect = () => ({ left: 0, top: 0, width: 0, height: 0 });
  assert.equal(w._isInReadingView(), false, "parked / hidden pane");
  delete global.document;
});
