// chat-p2p-chat-details.test.js — Chat details in the Inbox (chat-p2p): the
// header's ⋮ (menu_expand) toggles widget_chat_details for the open
// conversation, direct or workspace; the Inbox answers the widget's actions.
//
//   node --test tests/chat-p2p-chat-details.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const Module = require("node:module");
const sass = require("sass");

const node = (type) => (opt = {}) => ({ type, ...opt });
global.Skeletons = {
  Box: { X: node("Box.X"), Y: node("Box.Y") }, Note: node("Note"), Element: node("Element"),
  UserProfile: node("UserProfile"), Image: { Svg: node("Image.Svg") }, Button: { Svg: node("Button.Svg") },
};
const en = require("../locale/en.json");
global.LOCALE = new Proxy(en, { get: (t, k) => (k in t ? t[k] : k) });
global._ = require("underscore");
global._a = new Proxy({}, { get: (t, k) => k });
global._K = { permission: { download: 4 } };
global.window = {};
global.LetcBox = class {};
global.bootstrap = () => ({ endpoint: "/-/", keysel: "ks" });
global.KIND = { profile: "profile" };
String.prototype.format = function (...a) { return String(this).replace(/\{(\d+)\}/g, (_, i) => a[i]); };
global.SERVICE = { channel: { file_thread_list_by_folder: "channel.file_thread_list_by_folder" } };
const _load = Module._load;
Module._load = function (r, ...a) {
  if (r === "libs/support") return { supportAvatar: () => ({ type: "support" }), isSupportEntity: (id) => id === "support" };
  if (r === "media/grid/template/folder") return () => "<svg/>";
  if (r === "libs/chat-preview") return {};
  if (/chat-details\/skin$/.test(r) || r === "./skin") return {};
  if (r === "media/template/map") return require("../src/drumee/builtins/media/template/map");
  if (r === "libs/items-ready") return { armItemsReady() {}, markItemsReady() {} };
  return _load.call(this, r, ...a);
};

const header = require("../src/drumee/builtins/widget/chat-p2p/skeleton/chat-header");
const H = require("../src/drumee/builtins/widget/chat-p2p/chat-details-host");

const walk = (n, out = []) => {
  if (Array.isArray(n)) { n.forEach((k) => walk(k, out)); return out; }
  if (!n || typeof n !== "object") return out;
  out.push(n);
  (n.kids || []).forEach((k) => walk(k, out));
  return out;
};
const contact = (attrs) => ({ mget: (k) => attrs[k] });
const inboxUi = { fig: { family: "chat-p2p" } };

// ── header ────────────────────────────────────────────────────────────────
test("the ⋮ (menu_expand) toggles Chat details for a direct and a workspace chat", () => {
  for (const c of [
    contact({ entity_id: "u2", flag: "contact", fullname: "Ann" }),
    contact({ entity_id: "h1", flag: "share", display: "Team", area: "private" }),
  ]) {
    const btn = walk(header(inboxUi, c)).find((n) => n.ico === "menu_expand");
    assert.ok(btn);
    assert.equal(btn.service, "toggle-chat-details");
    assert.equal(btn.sys_pn, "details-btn");
  }
});

test("support threads have no ⋮", () => {
  const t = header(inboxUi, contact({ entity_id: "support", flag: "contact", fullname: "Support" }));
  assert.equal(walk(t).filter((n) => n.ico === "menu_expand").length, 0);
});

// ── host ──────────────────────────────────────────────────────────────────
function fakeInbox({ type = "privateRoom", peer = { entity_id: "u2", drumate_id: "u2", fullname: "Ann" } } = {}) {
  const parts = {};
  const mk = (pn) => (parts[pn] = parts[pn] || { pn, el: { dataset: {} }, fed: [], feed(k) { this.fed.push(k); }, clear() { this.fed.push("clear"); } });
  const calls = [];
  const inbox = {
    parts, calls,
    activePeer: peer,
    activePeerType: type,
    el: { dataset: {} },
    ensurePart: (pn) => Promise.resolve(mk(pn)),
    _startCall: (v) => calls.push(["call", v]),
    fetchService: async (args) => { calls.push(["fetch", args]); return [{ file_nid: "f1" }]; },
  };
  return inbox;
}

test("descriptor: direct for a private room, workspace for a share, none for support", () => {
  const d = H.descriptor(fakeInbox());
  assert.equal(d.kind, "widget_chat_details");
  assert.equal(d.mode, "direct");
  assert.equal(d.peer_id, "u2");
  const ws = H.descriptor(fakeInbox({ type: "share", peer: { entity_id: "h1", nid: "home1", area: "private" } }));
  assert.equal(ws.mode, "workspace");
  assert.equal(ws.hub_id, "h1");
  assert.equal(ws.nid, "home1");
  assert.equal(ws.privilege, 4); // row carries none: the chat bit (the Inbox only lists readable chats)
  assert.equal(H.descriptor(fakeInbox({ peer: { entity_id: "support", is_support: 1 } })), null);
  assert.equal(H.descriptor(fakeInbox({ type: "supportTicket" })), null);
});

test("open / close: feeds the slot, stamps data-details, the ⋮ shows open; narrow screens swap the pane", async () => {
  const inbox = fakeInbox();
  await H.open(inbox);
  assert.equal(inbox.parts["chat-details"].fed.at(-1).kind, "widget_chat_details");
  assert.equal(inbox.parts["chat-details"].fed.at(-1).host, inbox);
  assert.equal(inbox.el.dataset.details, "open");
  assert.equal(inbox.el.dataset.mview, "details");
  await H.close(inbox);
  assert.equal(inbox.el.dataset.details, "closed");
  assert.equal(inbox.el.dataset.mview, "chat");
  assert.equal(inbox.parts["chat-details"].fed.at(-1), "clear");
});

test("toggle opens then closes; switching conversation closes", async () => {
  const inbox = fakeInbox();
  await H.toggle(inbox);
  assert.equal(inbox.el.dataset.details, "open");
  await H.toggle(inbox);
  assert.equal(inbox.el.dataset.details, "closed");
  await H.toggle(inbox);
  H.onConversationChange(inbox);
  assert.equal(inbox.el.dataset.details, "closed");
});

test("actions: meeting calls, download opens the export overlay, open-media opens the player, close closes", async () => {
  const inbox = fakeInbox({ type: "share", peer: { entity_id: "h1", nid: "home1", area: "private", display: "Team" } });
  await H.open(inbox);
  const opened = [];
  const deps = { openMedia: async (p) => opened.push(p), Wm: null, Kind: { waitFor: async () => {} } };
  H.hostAction(inbox, "meeting", {}, deps);
  assert.deepEqual(inbox.calls.at(-1), ["call", true]);
  await H.hostAction(inbox, "download", {}, deps);
  assert.equal(inbox.parts["overlay-wrapper"].el.dataset.mode, "open");
  const exp = inbox.parts["wrapper-chat-overlay"].fed.at(-1);
  assert.equal(exp.kind, "widget_chat_export");
  assert.equal(exp.hub_id, "h1");
  assert.equal(exp.nid, "home1");
  assert.equal(exp.uiHandler[0], inbox);
  // A dialog closed before carries data-state=closed, which the global
  // [data-state="closed"] rule hides: the open path must clear it.
  assert.equal(inbox.parts["wrapper-chat-overlay"].el.dataset.state, "open");
  await H.hostAction(inbox, "open-media", { nid: "n1", hub_id: "h1", filetype: "document" }, deps);
  assert.deepEqual(opened, [{ nid: "n1", hub_id: "h1", filetype: "document" }]);
  await H.hostAction(inbox, "close", {}, deps);
  assert.equal(inbox.el.dataset.details, "closed");
});

test("a workspace thread opens that workspace's Chat tab scoped to the file thread", async () => {
  const inbox = fakeInbox({ type: "share", peer: { entity_id: "h1", nid: "home1" } });
  await H.open(inbox);
  const seen = [];
  const pane = { scopeChatToFile: (nid, label) => seen.push(["scope", nid, label]) };
  const Wm = {
    openNotificationLocation: async (a) => seen.push(["land", a]),
    _awaitWorkspaceWindow: async (hub) => (seen.push(["await", hub]), pane),
  };
  await H.hostAction(inbox, "thread", { file_nid: "f9", filename: "Spec" }, { Wm });
  assert.deepEqual(seen, [["land", { hub_id: "h1", activeTab: "chat" }], ["await", "h1"], ["scope", "f9", "Spec"]]);
  assert.equal(inbox.el.dataset.details, "closed");
});

test("threads come from the workspace home folder", async () => {
  const inbox = fakeInbox({ type: "share", peer: { entity_id: "h1", nid: "home1" } });
  const rows = await H.threads(inbox);
  assert.deepEqual(rows, [{ file_nid: "f1" }]);
  assert.deepEqual(inbox.calls.at(-1)[1], { service: "channel.file_thread_list_by_folder", hub_id: "h1", folder_nid: "home1", page: 1 });
});

// The Inbox covers every window-manager layer: a viewer Wm launches opens
// invisibly behind it. Pictures and videos go to the Inbox's own lightbox;
// anything else leaves the Inbox first.
test("open-media in the Inbox: image/video → the Inbox lightbox; other files leave the Inbox first", async () => {
  const inbox = fakeInbox({ type: "share", peer: { entity_id: "h1", nid: "home1" } });
  const shown = [];
  inbox.previewMedia = (m) => shown.push(m);
  const order = [];
  const deps = {
    openMedia: async (p) => order.push(["open", p.nid]),
    Desk: { closeSectionScreen: () => order.push(["leave"]) },
  };
  await H.hostAction(inbox, "open-media", { nid: "p1", hub_id: "hS", filetype: "image", filename: "a.png" }, deps);
  assert.equal(shown.length, 1);
  assert.equal(shown[0].mget("filetype"), "image");
  assert.equal(shown[0].actualNode("slide").url, "/-/file/slide/p1/hS?keysel=ks");
  assert.equal(shown[0].actualNode("orig").url, "/-/file/orig/p1/hS?keysel=ks");
  assert.equal(shown[0].fullname(), "a.png");
  await H.hostAction(inbox, "open-media", { nid: "v1", hub_id: "hS", filetype: "video" }, deps);
  assert.equal(shown.length, 2);
  assert.deepEqual(order, []);
  await H.hostAction(inbox, "open-media", { nid: "d1", hub_id: "hS", filetype: "document" }, deps);
  assert.deepEqual(order, [["leave"], ["open", "d1"]]);
});

// Switching the Direct / Workspace tab puts the other tab's parked
// conversation back (_showPane) without going through openChat: the panel
// described the previous one, and its buttons would act on the new one.
test("inbox: switching scope tab closes Chat details", async () => {
  const Inbox = require("../src/drumee/builtins/widget/chat-p2p");
  const inbox = fakeInbox();
  await H.open(inbox);
  Object.assign(inbox, {
    _panes: { workspace: { peer: { entity_id: "h1" }, type: "share", widget: {}, contact: null } },
    fig: inboxUi.fig, _lists: {}, _listKey: (k) => k, _markSelected() {},
  });
  inbox.parts["chat-header"] = { el: { dataset: {} }, clear() {}, feed() {} };
  Inbox.prototype._showPane.call(inbox, "workspace");
  assert.equal(inbox.el.dataset.details, "closed");
  assert.equal(inbox.activePeer.entity_id, "h1");
});

// ── loading placeholder + show / close animation ─────────────────────────
const deferred = () => { let resolve; const promise = new Promise((r) => (resolve = r)); return { promise, resolve }; };
const hasCls = (n, c) => (n.className || "").split(/\s+/).includes(c);

// widget_chat_details is a lazy kind: until its chunk lands the column would
// be blank. The slot shows the widget's own loading overview (a card, its ✕
// live) at once, then the widget, which opens on the same skeleton.
test("open: a loading card at once, the widget when its kind is ready", async () => {
  const inbox = fakeInbox();
  const kind = deferred();
  const opening = H.open(inbox, { Kind: { waitFor: () => kind.promise } });
  await new Promise((r) => setImmediate(r));
  const slot = inbox.parts["chat-details"];
  assert.equal(slot.fed.length, 1);
  const card = slot.fed[0];
  assert.ok(hasCls(card, "widget-chat-details__ui"), "the placeholder is the widget's card");
  assert.ok(walk(card).some((n) => hasCls(n, "widget-chat-details-skeleton")), "skeleton rows");
  const x = walk(card).find((n) => n.service === "close-chat-details");
  assert.equal(x.uiHandler[0], inbox, "its ✕ reaches the Inbox");
  // A direct chat's placeholder shows only the tiles a direct chat has.
  assert.deepEqual(walk(card).filter((n) => /^chat-details-(mute|meeting|download)$/.test(n.service)).map((n) => n.service), ["chat-details-mute", "chat-details-meeting", "chat-details-download"]);
  assert.equal(inbox.el.dataset.details, "open");
  kind.resolve();
  await opening;
  assert.equal(slot.fed.at(-1).kind, "widget_chat_details");
});

test("a widget chunk landing after the panel closed never feeds it", async () => {
  const inbox = fakeInbox();
  const kind = deferred();
  const opening = H.open(inbox, { Kind: { waitFor: () => kind.promise } });
  await new Promise((r) => setImmediate(r));
  H.onConversationChange(inbox);
  kind.resolve();
  await opening;
  assert.ok(!inbox.parts["chat-details"].fed.some((k) => k && k.kind === "widget_chat_details"));
});

test("close slides out first: data-details=closing, then closed and emptied", async () => {
  const inbox = fakeInbox();
  await H.open(inbox);
  const slot = inbox.parts["chat-details"];
  const closing = H.close(inbox);
  assert.equal(inbox.el.dataset.details, "closing");
  assert.equal(inbox.el.dataset.mview, "details", "the pane stays while it animates");
  assert.notEqual(slot.fed.at(-1), "clear");
  await closing;
  assert.equal(inbox.el.dataset.details, "closed");
  assert.equal(inbox.el.dataset.mview, "chat");
  assert.equal(slot.fed.at(-1), "clear");
});

test("switching conversation closes at once (no animation)", async () => {
  const inbox = fakeInbox();
  await H.open(inbox);
  H.onConversationChange(inbox);
  assert.equal(inbox.el.dataset.details, "closed");
  assert.equal(inbox.parts["chat-details"].fed.at(-1), "clear");
});

test("the ⋮ during the slide-out reopens; the pending close never lands", async () => {
  const inbox = fakeInbox();
  await H.open(inbox);
  const closing = H.close(inbox);
  await H.toggle(inbox);
  assert.equal(inbox.el.dataset.details, "open");
  await closing;
  await new Promise((r) => setTimeout(r, 300));
  assert.equal(inbox.el.dataset.details, "open");
  assert.equal(inbox.parts["chat-details"].fed.at(-1).kind, "widget_chat_details");
});

test("inbox: the placeholder's ✕ (close-chat-details) closes the panel", async () => {
  const Inbox = require("../src/drumee/builtins/widget/chat-p2p");
  const inbox = fakeInbox();
  await H.open(inbox);
  await Inbox.prototype.onUiEvent.call(inbox, { get: () => undefined }, { service: "close-chat-details" });
  assert.equal(inbox.el.dataset.details, "closed");
});

// ── skin ──────────────────────────────────────────────────────────────────
const SRC = path.join(__dirname, "..", "src/drumee");
const css = sass
  .compile(path.join(SRC, "builtins/widget/chat-p2p/skin/index.scss"), { loadPaths: [SRC, path.join(SRC, "skin")], logger: sass.Logger.silent })
  .css.replace(/\s+/g, " ");
const rule = (sel) => {
  const m = css.match(new RegExp("(?:^|\\}\\s*)" + sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + " \\{([^}]*)\\}"));
  assert.ok(m, `missing rule ${sel}`);
  return m[1];
};

test("skin: hidden until open; a side column on desktop; the whole pane on narrow screens", () => {
  assert.match(rule(".chat-p2p__chat-details"), /display: none !important/);
  const col = rule(".chat-p2p__ui[data-details=open] .chat-p2p__chat-details");
  assert.match(col, /display: flex !important/);
  assert.match(col, /width: clamp\(320px, 28vw, 400px\)/);
  assert.match(css, /@media \(max-width: 1024px\) \{[^@]*\.chat-p2p__ui\[data-mview=details\] \.chat-p2p__chat-area, \.chat-p2p__ui\[data-mview=details\] \.chat-p2p__sidebar \{ display: none; \}/);
});

// Inbox: sidebar | chat area | details are separate cards with a gutter, not
// panes of one outlined box.
test("skin: Inbox panes are separate cards with a gap between them", () => {
  assert.match(rule(".chat-p2p__main"), /gap: 8px/);
  const ui = rule(".chat-p2p__ui");
  assert.match(ui, /border: none/);
  assert.match(ui, /background-color: transparent/);
  for (const pane of [".chat-p2p__sidebar", ".chat-p2p__chat-area"]) {
    const r = rule(pane);
    assert.match(r, /border: 1px solid rgba\(0, 0, 0, 0\.05\)/, pane);
    assert.match(r, /border-radius: 8px/, pane);
    assert.doesNotMatch(r, /border-(left|right):/, pane);
  }
  assert.doesNotMatch(rule('.chat-p2p__ui[data-details=open] .chat-p2p__chat-details'), /border-left/);
  // Narrow screens keep the card edges (no one-sided resets).
  assert.doesNotMatch(css, /@media \(max-width: 1024px\) \{[^@]*\.chat-p2p__(chat-area|sidebar) \{[^}]*border-(left|right): none/);
});

test("skin: white ground under the cards", () => {
  assert.match(rule(".chat-p2p__main"), /background-color: var\(--normal-bg-elevated, #fff\)/);
});

test("skin: details slide in on open, slide out while closing, still under reduced motion", () => {
  assert.match(rule(".chat-p2p__ui[data-details=open] .chat-p2p__chat-details"), /animation: chat-p2p-details-in /);
  const out = rule(".chat-p2p__ui[data-details=closing] .chat-p2p__chat-details");
  assert.match(out, /display: flex !important/);
  assert.match(out, /width: clamp\(320px, 28vw, 400px\)/);
  assert.match(out, /animation: chat-p2p-details-out /);
  assert.match(out, /pointer-events: none/);
  assert.match(css, /@keyframes chat-p2p-details-in/);
  assert.match(css, /@keyframes chat-p2p-details-out/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{[^@]*\.chat-p2p__chat-details \{ animation: none/);
});

// Inbox: the meeting tile is a call — telephone_handset + "Call" — in the
// widget (host.chatDetailsMeetingState) and in the loading card alike.
const meetingTileOf = (tree) => walk(tree).find((n) => n.service === "chat-details-meeting");
const tileIco = (tile) => walk(tile).filter((n) => n.ico).map((n) => n.ico);
const tileText = (tile) => walk(tile).filter((n) => n.type === "Note").map((n) => n.content);

test("Inbox: the meeting tile reads Call with the telephone handset", async () => {
  const st = H.meetingState(fakeInbox());
  assert.equal(st.label, en.CALL);
  assert.equal(st.ico, "telephone_handset");
  assert.equal(st.joined, false);
  const inbox = fakeInbox();
  const kind = deferred();
  H.open(inbox, { Kind: { waitFor: () => kind.promise } });
  await new Promise((r) => setImmediate(r));
  const tile = meetingTileOf(inbox.parts["chat-details"].fed[0]);
  assert.deepEqual(tileIco(tile), ["telephone_handset"]);
  assert.ok(tileText(tile).includes(en.CALL));
  kind.resolve();
});

test("inbox: chatDetailsMeetingState answers the widget with the call tile", () => {
  const Inbox = require("../src/drumee/builtins/widget/chat-p2p");
  const st = Inbox.prototype.chatDetailsMeetingState.call(fakeInbox());
  assert.equal(st.ico, "telephone_handset");
  assert.equal(st.label, en.CALL);
});

test("Inbox Download on a direct chat opens the DIRECT export dialog", async () => {
  global.Visitor = { id: "me0000000000000a" };
  const inbox = fakeInbox(); // privateRoom, peer u2 "Ann"
  await H.open(inbox);
  await H.hostAction(inbox, "download", {}, { Kind: { waitFor: async () => {} } });
  const exp = inbox.parts["wrapper-chat-overlay"].fed.at(-1);
  assert.equal(exp.kind, "widget_chat_export");
  assert.equal(exp.mode, "direct");
  assert.equal(exp.peer_id, "u2");
  assert.equal(exp.hub_id, "me0000000000000a");
  assert.equal(exp.name, "Ann");
  assert.equal(exp.uiHandler[0], inbox);
});

test("skin: the conversation body keeps 6px on the right", () => {
  assert.match(rule(".chat-p2p__chat-area .widget-chat__body"), /padding-right: 6px/);
});
