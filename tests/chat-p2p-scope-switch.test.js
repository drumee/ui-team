// Inbox (chat_p2p) scope tabs: Direct Chat <-> Workspace chat.
//
// The widget is real; the framework around it is stubbed — lists, the chat
// panel, widget_chat and every server call — so each test can count exactly
// which requests a switch costs and which conversation ends up on screen.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const Module = require("node:module");

const WIDGET = path.join(__dirname, "..", "src/drumee/builtins/widget/chat-p2p");
const LIBS = path.join(__dirname, "..", "src/drumee/libs");

// ── Module stubs ─────────────────────────────────────────────────────
const STUBS = {
  "./skin": {},
  "./skeleton": () => ({}),
  "./skeleton/chat-header": (ui, contact) => ({ kind: "header", contact }),
  "libs/support": { supportContactId: () => null, isSupportEntity: () => false },
  "libs/chat-preview": {
    chatPreview: (m) => m,
    findMeetingRow: () => null,
    meetingStatusOf: () => null,
  },
};
const load = Module._load;
Module._load = function (request, parent, isMain) {
  if (Object.prototype.hasOwnProperty.call(STUBS, request)) return STUBS[request];
  if (request === "libs/items-ready") return load.call(this, path.join(LIBS, "items-ready.js"), parent, isMain);
  return load.call(this, request, parent, isMain);
};

// ── Globals ──────────────────────────────────────────────────────────
global._ = require("underscore");
const lex = require(path.join(__dirname, "..", "src/drumee/lex/attribute.js"));
global._a = new Proxy(lex, { get: (t, k) => (k in t ? t[k] : k) });
global._e = new Proxy({}, { get: (t, k) => k });
global.SERVICE = {
  chat: {
    chat_rooms: "chat.chat_rooms",
    share_rooms: "chat.share_rooms",
    post: "chat.post",
    acknowledge: "chat.acknowledge",
    change_status: "chat.change_status",
  },
  channel: { post: "channel.post", acknowledge: "channel.acknowledge" },
  media: { home: "media.home" },
  support: { greet: "support.greet" },
};
global.LOCALE = new Proxy({}, { get: (t, k) => k });
global.Visitor = { id: "ME", get: (k) => (k === "id" ? "ME" : null), isMobile: () => false, language: () => "en" };
global.window = { innerWidth: 1440 };
const radio = () => ({ on() {}, off() {}, trigger() {} });
global.RADIO_BROADCAST = radio();
global.RADIO_CLICK = radio();
global.Desk = {
  _workspaces: [{ hub_id: "WS1", area: "share", kind: "k" }],
  wsFetches: 0,
  async _fetchWorkspaces() { this.wsFetches++; return this._workspaces; },
};
global.Kind = { waitFor: async () => ({}) };
global.MutationObserver = class { observe() {} disconnect() {} };
const tick = () => new Promise((r) => setTimeout(r, 0));
const settle = async () => { for (let i = 0; i < 8; i++) await tick(); };

// A DOM element stand-in: dataset + style + the two queries the widget makes.
function el() {
  return { dataset: {}, style: {}, querySelector: () => null, querySelectorAll: () => [], closest: () => null };
}

// Event emitter with the once/trigger subset lists use.
function emitter(o) {
  const h = {};
  o.once = (ev, fn) => { (h[ev] = h[ev] || []).push(fn); };
  o.trigger = (ev, ...a) => { const f = h[ev] || []; h[ev] = []; f.forEach((fn) => fn(...a)); };
  return o;
}

// A row view (chat_contact_item).
function row(attrs) {
  const m = { ...attrs };
  return {
    el: el(),
    mget: (k) => m[k],
    mset: (k, v) => { m[k] = v; },
    model: { toJSON: () => ({ ...m }) },
    toLETC: () => ({ ...m }),
  };
}

function kidsOf(arr) {
  return {
    toArray: () => arr.slice(),
    forEach: (fn) => arr.forEach(fn),
    get length() { return arr.length; },
  };
}

// List.Smart stand-in. `load(rows)` delivers a page and fires eod.
function list(ui, apiFn) {
  const rows = [];
  const l = emitter({
    el: el(),
    rows,
    restarts: 0,
    fetches: [],
    children: kidsOf(rows),
    collection: { sort() {} },
    prepareData: (d) => d,
    mget: (k) => (k === "itemsOpt" ? {} : undefined),
    getItemsByAttr: (k, v) => rows.filter((r) => r.mget(k) === v),
    prepend(o) { const r = row(o); rows.unshift(r); return r; },
    restart() {
      this.restarts++;
      this.trigger("eod"); // ui-core flushes stale eod listeners
      const api = apiFn();
      if (api.service) this.fetches.push(api.service);
    },
    load(data) {
      rows.length = 0;
      this.prepareData(data).forEach((d) => rows.push(row(d)));
      this.trigger("eod");
    },
  });
  const api = apiFn();
  if (api.service) l.fetches.push(api.service);
  return l;
}

// widget_chat stand-in, with the park/unpark contract.
const mounted = [];
function chatWidget(opt) {
  const w = {
    opt,
    el: el(),
    destroyed: false,
    parks: 0,
    unparks: 0,
    isDestroyed() { return this.destroyed; },
    selfDestroy() { this.destroyed = true; },
    park() { this.parks++; this.el.dataset.parked = "1"; },
    unpark() { this.unparks++; this.el.dataset.parked = "0"; },
  };
  // widget_chat stamps this when its first page of messages is in.
  w.el.dataset.painted = "1";
  mounted.push(w);
  return w;
}

global.LetcBox = class {
  constructor(opt = {}) { this._opt = opt; this.el = el(); this._parts = {}; }
  initialize(opt) { this.el.dataset = { ...opt.dataset }; }
  declareHandlers() {}
  bindEvent() {}
  mget(k) { return this._opt[k]; }
  mset(k, v) { this._opt[k] = v; }
  warn() {}
  isDestroyed() { return false; }
  feed() {}
  getPart(n) { return this._parts[n]; }
  ensurePart(n) { return Promise.resolve(this._parts[n]); }
};

const ChatP2p = require(WIDGET);

// ── Fixture ──────────────────────────────────────────────────────────
function mount() {
  mounted.length = 0;
  Desk.wsFetches = 0;
  const ui = new ChatP2p({ widgetId: "w" });
  ui.initialize({});
  ui.fig = { family: "chat-p2p" };
  const calls = [];
  ui.fetchService = async (svc, p) => { calls.push({ svc, ...p }); return { home_id: `home-${p.hub_id}`, chat_upload_id: "u" }; };
  ui.postService = async () => ({});
  const header = { fed: [], clear() {}, feed(x) { this.fed.push(x); } };
  const panel = {
    el: el(),
    children: [],
    append(o) { const w = chatWidget(o); this.children.push(w); return w; },
  };
  const tabs = {};
  ["direct", "workspace", "support"].forEach((k) => {
    tabs[k] = { state: 0, setState(s) { this.state = s; } };
    ui._parts[`scope-tab-${k}`] = tabs[k];
  });
  ui._parts["chat-header"] = header;
  ui._parts["chat-panel"] = panel;
  const direct = list(ui, ui.getDirectApi);
  const ws = list(ui, ui.getWorkspaceApi);
  ui._parts["contact-list"] = direct;
  ui._parts["contact-list-ws"] = ws;
  ui.onPartReady(direct, "contact-list");
  ui.onPartReady(ws, "contact-list-ws");
  return { ui, calls, header, panel, tabs, direct, ws };
}

const PEERS = [
  { entity_id: "P1", drumate_id: "P1", flag: "contact", ctime: 3 },
  { entity_id: "P2", drumate_id: "P2", flag: "contact", ctime: 2 },
];
const WORKSPACES = [
  { id: "WS1", group_name: "Team", room_count: 0, ctime: 5 },
  { id: "WS2", group_name: "Ops", room_count: 0, ctime: 4 },
];
const homes = (calls) => calls.filter((c) => c.svc === "media.home").map((c) => c.hub_id);

async function landedOnDirect() {
  const f = mount();
  f.direct.load(PEERS);
  await settle();
  return f;
}

// ── Tests ────────────────────────────────────────────────────────────
test("the Workspace list does not query the server until its tab is pressed", async () => {
  const f = await landedOnDirect();
  assert.deepEqual(f.ws.fetches, [], "group_chat_rooms is the costly proc");
  assert.deepEqual(f.direct.fetches, ["chat.chat_rooms"]);
});

test("mount lands on the first direct row, with media.home fetched once and handed over", async () => {
  const f = await landedOnDirect();
  assert.equal(mounted.length, 1);
  assert.equal(mounted[0].opt.hub_id, "P1");
  assert.deepEqual(homes(f.calls), ["ME"]);
  assert.equal(mounted[0].opt.prefetched_home.home_id, "home-ME", "widget_chat must not refetch it");
});

test("first Workspace press loads it once, parks the direct chat, lands on its first row", async () => {
  const f = await landedOnDirect();
  const dm = mounted[0];
  await f.ui._setRoomScope("workspace");
  await settle();
  assert.equal(f.ws.restarts, 1);
  assert.deepEqual(f.ws.fetches, ["chat.share_rooms"]);
  assert.equal(f.ui.el.dataset.loading, "1", "skeleton over the first load");
  assert.equal(dm.destroyed, false, "direct conversation is kept");
  assert.equal(dm.el.dataset.parked, "1");
  assert.equal(f.ui.el.dataset.scope, "workspace");
  f.ws.load(WORKSPACES);
  await settle();
  const room = mounted[1];
  assert.equal(room.opt.hub_id, "WS1");
  assert.equal(room.opt.type, "share");
  assert.deepEqual(homes(f.calls), ["ME", "WS1"]);
  assert.equal(room.opt.prefetched_home.home_id, "home-WS1");
  assert.equal(f.ui.activePeer.entity_id, "WS1");
});

test("switching back and forth after that costs no request and no remount", async () => {
  const f = await landedOnDirect();
  await f.ui._setRoomScope("workspace");
  await settle();
  f.ws.load(WORKSPACES);
  await settle();
  const [dm, room] = mounted;
  const before = { calls: f.calls.length, direct: f.direct.fetches.length, ws: f.ws.fetches.length };

  for (let i = 0; i < 3; i++) {
    await f.ui._setRoomScope("direct");
    await settle();
    assert.equal(f.ui.el.dataset.scope, "direct");
    assert.equal(dm.el.dataset.parked, "0");
    assert.equal(room.el.dataset.parked, "1");
    assert.equal(f.ui.activePeer.entity_id, "P1");
    assert.equal(f.ui.chatWidget, dm);
    assert.equal(f.header.fed.at(-1).contact.mget("entity_id"), "P1");

    await f.ui._setRoomScope("workspace");
    await settle();
    assert.equal(room.el.dataset.parked, "0");
    assert.equal(dm.el.dataset.parked, "1");
    assert.equal(f.ui.activePeer.entity_id, "WS1");
    assert.equal(f.ui.chatWidget, room);
  }
  assert.equal(mounted.length, 2, "no conversation remounted");
  assert.equal(f.calls.length, before.calls, "no media.home / other request");
  assert.equal(f.direct.fetches.length, before.direct);
  assert.equal(f.ws.fetches.length, before.ws);
  assert.equal(f.ws.restarts, 1);
});

test("re-pressing the active tab is a no-op, including Direct before any press", async () => {
  const f = await landedOnDirect();
  await f.ui._setRoomScope("direct");
  await settle();
  assert.equal(f.direct.restarts, 0);
  assert.equal(mounted.length, 1);
  assert.equal(mounted[0].unparks, 0);
});

test("the personal media.home is fetched once for every direct conversation", async () => {
  const f = await landedOnDirect();
  await f.ui.openChat(f.direct.rows[1]);
  await settle();
  await f.ui.openChat(f.direct.rows[0]);
  await settle();
  assert.deepEqual(homes(f.calls), ["ME"]);
  // Each click replaced this tab's conversation, never stacked a second one.
  assert.equal(mounted.filter((w) => !w.destroyed).length, 1);
});

test("clicking the row already open shows it instead of remounting", async () => {
  const f = await landedOnDirect();
  await f.ui.openChat(f.direct.rows[0]);
  await settle();
  assert.equal(mounted.length, 1);
  assert.equal(mounted[0].destroyed, false);
});

test("two quick clicks mount the one clicked last", async () => {
  const f = await landedOnDirect();
  let release;
  const gate = new Promise((r) => (release = r));
  f.ui._homeCache.clear();
  f.ui.fetchService = async (svc, p) => { await gate; return { home_id: `home-${p.hub_id}` }; };
  const a = f.ui.openChat(f.direct.rows[1]); // P2, slow
  const b = f.ui.openChat(f.direct.rows[0]); // P1, clicked last
  release();
  await Promise.all([a, b]);
  await settle();
  const live = mounted.filter((w) => !w.destroyed);
  assert.equal(live.length, 1);
  assert.equal(live[0].opt.hub_id, "P1");
});

test("a DM opened while Workspace chat is showing goes under Direct and syncs the tabs", async () => {
  const f = await landedOnDirect();
  await f.ui._setRoomScope("workspace");
  await settle();
  f.ws.load(WORKSPACES);
  await settle();
  // compose picker row: lives in neither list
  const picked = row({ entity_id: "P9", drumate_id: "P9", flag: "contact" });
  await f.ui.openChat(picked);
  await settle();
  assert.equal(f.ui._scopeKey(), "direct");
  assert.equal(f.tabs.direct.state, 1);
  assert.equal(f.tabs.workspace.state, 0);
  assert.equal(f.ui.el.dataset.scope, "direct");
  assert.equal(f.ui.activePeer.entity_id, "P9");
  const room = mounted.find((w) => w.opt.hub_id === "WS1");
  assert.equal(room.destroyed, false, "workspace conversation stays parked");
  assert.equal(room.el.dataset.parked, "1");
});

test("a live post updates the hidden list too; a new peer lands in Direct, not Workspace", async () => {
  const f = await landedOnDirect();
  await f.ui._setRoomScope("workspace");
  await settle();
  f.ws.load(WORKSPACES);
  await settle();
  f.ui.onWsMessage("live.update", { peer_id: "P2", author_id: "P2", message: "hi", ctime: 9 }, { service: "chat.post" });
  assert.equal(f.direct.rows.find((r) => r.mget("entity_id") === "P2").mget("room_count"), 1);
  f.ui.onWsMessage("live.update", { peer_id: "NEW", author_id: "NEW", message: "yo", ctime: 10 }, { service: "chat.post" });
  assert.ok(f.direct.rows.some((r) => r.mget("entity_id") === "NEW"));
  assert.ok(!f.ws.rows.some((r) => r.mget("entity_id") === "NEW"));
  f.ui.onWsMessage("live.update", { hub_id: "WS2", author_id: "X", message: "m", ctime: 11 }, { service: "channel.post" });
  assert.equal(f.ws.rows.find((r) => r.mget("entity_id") === "WS2").mget("room_count"), 1);
});

test("a click during the first Workspace load is not overridden by its landing", async () => {
  const f = await landedOnDirect();
  await f.ui._setRoomScope("workspace");
  await settle();
  f.ws.load(WORKSPACES);
  // The user clicks the second workspace before the landing's await resolves.
  await f.ui.openChat(f.ws.rows[1]);
  await settle();
  const live = mounted.filter((w) => !w.destroyed && w.opt.type === "share");
  assert.equal(live.length, 1);
  assert.equal(live[0].opt.hub_id, "WS2");
});

test("pressing Workspace then Direct before the first Workspace page keeps Direct", async () => {
  const f = await landedOnDirect();
  await f.ui._setRoomScope("workspace");
  await settle();
  await f.ui._setRoomScope("direct");
  await settle();
  f.ws.load(WORKSPACES); // lands while Direct is showing
  await settle();
  assert.equal(f.ui._scopeKey(), "direct");
  assert.equal(f.ui.activePeer.entity_id, "P1");
  assert.equal(mounted.filter((w) => w.opt.type === "share").length, 0);
  assert.equal(f.ui.el.dataset.loading, "0", "skeleton lowered by the restored pane");
  // ...and the next Workspace press lands without refetching.
  await f.ui._setRoomScope("workspace");
  await settle();
  assert.equal(f.ws.restarts, 1);
  assert.equal(mounted.filter((w) => w.opt.type === "share").length, 1);
});

test("a failed first Workspace page is retried on the next visit", async () => {
  const f = await landedOnDirect();
  await f.ui._setRoomScope("workspace");
  await settle();
  f.ws.trigger("error");
  assert.equal(f.ui.el.dataset.loading, "0");
  await f.ui._setRoomScope("direct");
  await settle();
  await f.ui._setRoomScope("workspace");
  await settle();
  assert.equal(f.ws.restarts, 2);
});

test("an empty Workspace list clears only its own pane", async () => {
  const f = await landedOnDirect();
  const dm = mounted[0];
  await f.ui._setRoomScope("workspace");
  await settle();
  f.ws.load([]);
  await settle();
  assert.equal(f.ui.activePeer, null);
  assert.equal(f.ui.el.dataset.loading, "0");
  assert.equal(dm.destroyed, false);
  await f.ui._setRoomScope("direct");
  await settle();
  assert.equal(f.ui.activePeer.entity_id, "P1");
});

test("the X closes the Inbox through the desk's section-screen exit", async () => {
  const f = await landedOnDirect();
  let closed = 0;
  Desk.closeSectionScreen = () => { closed++; };
  const togglePanel = (Desk.togglePanel = () => { throw new Error("wrong slot"); });
  f.ui.onUiEvent({ get: () => "close-chat" }, {});
  assert.equal(closed, 1);
  assert.ok(togglePanel);
  delete Desk.closeSectionScreen;
  delete Desk.togglePanel;
});

test("Inbox conversations attach from the device only", async () => {
  const f = await landedOnDirect();
  assert.equal(mounted[0].opt.no_workspace_attach, 1);
  await f.ui._setRoomScope("workspace");
  await settle();
  f.ws.load(WORKSPACES);
  await settle();
  assert.equal(mounted.find((w) => w.opt.type === "share").opt.no_workspace_attach, 1);
});
