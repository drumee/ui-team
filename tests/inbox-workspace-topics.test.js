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
  assert.match(inbox, /\.chat-p2p__chat-area:not\(\[data-topics="?1"?\]\) \.chat-p2p__topic-row \{ display: none; \}/);
});

test("skin: strip and File threads bar share one row at equal widths", () => {
  const inbox = compile("builtins/widget/chat-p2p/skin/index.scss");
  const row = ruleIn(inbox, ".chat-p2p__chat-area .chat-p2p__topic-row");
  assert.match(row, /display: flex/);
  assert.match(row, /flex-direction: row/);
  assert.match(row, /align-items: center/);
  const strip = ruleIn(inbox, ".chat-p2p__chat-area .chat-p2p__topic-row .window__topic-strip");
  const bar = ruleIn(inbox, ".chat-p2p__chat-area .chat-p2p__topic-row .window__ft-bar");
  for (const r of [strip, bar]) {
    assert.match(r, /flex: 1 1 0/);
    assert.match(r, /min-width: 0/);
  }
  // The dropdown spans the bar (no fixed width of its own).
  const list = ruleIn(inbox, ".chat-p2p__chat-area .chat-p2p__topic-row .window__ft-list");
  assert.match(list, /left: 0/);
  assert.match(list, /right: 12px/);
  assert.doesNotMatch(list, /width:/);
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

test("skeleton: chat area = header · [topic strip | ft bar] row · chat panel; the dialog slot is always there", () => {
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
  assert.deepEqual(area.kids.map((k) => k.sys_pn || k.className), ["chat-header", "chat-p2p__topic-row", "chat-panel"]);
  const row = area.kids[1];
  assert.equal(row.type, "Box.X");
  assert.deepEqual(row.kids.map((k) => k.sys_pn), ["topic-strip", "ft-bar"]);
  assert.equal(row.kids[0].className, "window__topic-strip");
  assert.equal(row.kids[1].className, "window__ft-bar");
  assert.equal(row.kids[1].dataset.open, "0");
  assert.equal(row.kids[0].partHandler, ui);
  const slot = all.find((n) => n.name === "topic-dialog");
  assert.equal(slot.className, "widget-topic-create__viewport-backdrop");
  assert.equal(slot.partHandler, ui);
});

// ── Module (fake Inbox) ──
global.SERVICE = { channel: { topic_list: "channel.topic_list", topic_create: "channel.topic_create", file_thread_list_by_folder: "channel.file_thread_list_by_folder" } };
const listeners = {};
global.document = {
  addEventListener: (t, f) => ((listeners[t] = listeners[t] || new Set()).add(f)),
  removeEventListener: (t, f) => listeners[t] && listeners[t].delete(f),
};
const fire = (t, e) => [...(listeners[t] || [])].forEach((f) => f(e));
const flush = () => new Promise((r) => setImmediate(r));
{
  const Module = require("node:module");
  const load = Module._load;
  Module._load = function (r, ...a) { if (/topics-mock$/.test(r)) return { withMockTopics: (rows) => rows }; return load.call(this, r, ...a); };
}
const WT = require("../src/drumee/builtins/widget/chat-p2p/workspace-topics");
const TOPICS = [{ id: "t1", name: "A", emoji: "🎨" }, { id: "t2", name: "B" }, { id: "t3", name: "C" }, { id: "t4", name: "D" }];

function chatWidget() {
  return {
    calls: [], scopedTopicId: "general", scopedFileNid: "",
    isDestroyed: () => false,
    setScopedTopic(t) { this.calls.push(["topic", t]); this.scopedTopicId = t; },
    setScopedFileNid(n, l) { this.calls.push(["file", n, l]); this.scopedFileNid = n ? `${n}` : ""; },
  };
}
function fakeInbox({ scope = "workspace", topics = TOPICS, threads = [{ file_nid: "f1", filename: "Q2" }] } = {}) {
  const calls = [];
  const parts = {};
  const mk = (pn) => (parts[pn] = parts[pn] || { pn, el: { dataset: {}, contains: (x) => x === "inside" }, fed: [], feed(k) { this.fed.push(k); }, clear() { this.fed.push("cleared"); } });
  return {
    calls, parts, _scope: scope,
    fig: { family: "chat-p2p", group: "chat-p2p" },
    _panes: { workspace: { type: "share", peer: { entity_id: "H1", nid: "home-H1" }, widget: chatWidget() } },
    _scopeKey() { return this._scope; },
    ensurePart: (pn) => Promise.resolve(mk(pn)),
    fetchService: async (name, p) => { calls.push([name, p]); return name === "channel.topic_list" ? topics : threads; },
    postService: async (name, p) => (calls.push([name, p]), { id: "t9", name: p.name, emoji: p.emoji }),
  };
}
// Class names of a fed tree (the descriptors hold the fake Inbox: no JSON).
const classes = (kids) => walk(kids).map((n) => n.className || "").join(" | ");
const lastFeed = (win, pn) => { const f = win.parts[pn].fed; return f[f.length - 1]; };
const stripPage_ = (kids) => kids.find((k) => /__topic-page\b/.test(k.className || "")) || { kids: [] };
const activeTab = (kids) => stripPage_(kids).kids.filter((k) => k.dataset.active === "1").map((k) => k.topic_id || k.service);

test("sync on a new workspace pane fetches that hub's root-folder topics and paints #General active", async () => {
  const win = fakeInbox();
  await WT.sync(win);
  assert.deepEqual(win.calls[0], ["channel.topic_list", { hub_id: "H1", folder_nid: "home-H1" }]);
  assert.equal(win.parts["chat-area"].el.dataset.topics, "1");
  const strip = lastFeed(win, "topic-strip");
  assert.deepEqual(activeTab(strip), ["thread-menu-general"]);
  assert.match(classes(strip), /window__topic-tab--create/);
  assert.equal(win.parts["ft-bar"].el.dataset.open, "0");
  // Re-sync of the same pane (tab switched back): no refetch.
  await WT.sync(win);
  assert.equal(win.calls.filter((c) => c[0] === "channel.topic_list").length, 1);
});

test("Direct scope (or no workspace pane): strip and bar are emptied and the area unstamped", async () => {
  const win = fakeInbox({ scope: "direct" });
  await WT.sync(win);
  assert.equal(win.calls.length, 0);
  assert.equal(win.parts["chat-area"].el.dataset.topics, "0");
  assert.deepEqual(lastFeed(win, "topic-strip"), []);
  assert.deepEqual(lastFeed(win, "ft-bar"), []);
});

test("a topic tab scopes the widget; # General scopes back; a file scope is left first", async () => {
  const win = fakeInbox();
  await WT.sync(win);
  const w = win._panes.workspace.widget;
  w.scopedFileNid = "f1";
  await WT.scopeTopic(win, "t2");
  assert.deepEqual(w.calls, [["file", null, null], ["topic", "t2"]]);
  assert.deepEqual(activeTab(lastFeed(win, "topic-strip")), ["t2"]);
  await WT.scopeTopic(win, "all");
  assert.equal(w.scopedTopicId, "general");
});

test("carousel: next/back clamp and slide once; picking a topic on page 2 jumps there", async () => {
  const win = fakeInbox();
  await WT.sync(win);
  await WT.stripPage(win, +1);
  assert.equal(stripPage_(lastFeed(win, "topic-strip")).dataset.slide, "next");
  await WT.stripPage(win, +1); // last page already (5 entries / 3)
  assert.equal(stripPage_(lastFeed(win, "topic-strip")).dataset.slide, "none");
  await WT.stripPage(win, -1);
  assert.equal(stripPage_(lastFeed(win, "topic-strip")).dataset.slide, "prev");
  await WT.scopeTopic(win, "t4");
  assert.equal(stripPage_(lastFeed(win, "topic-strip")).dataset.slide, "next");
  assert.deepEqual(activeTab(lastFeed(win, "topic-strip")), ["t4"]);
});

test("state lives on the pane: a new workspace pane starts over; a slow answer for the old one paints nothing", async () => {
  let release;
  const win = fakeInbox();
  await WT.sync(win);
  await WT.scopeTopic(win, "t4");
  const old = win._panes.workspace;
  win.fetchService = (name, p) => (win.calls.push([name, p]), new Promise((r) => (release = () => r(TOPICS))));
  win._panes.workspace = { type: "share", peer: { entity_id: "H2", nid: "home-H2" }, widget: chatWidget() };
  const pending = WT.sync(win);
  // Old pane replaced meanwhile by a third one.
  win._panes.workspace = { type: "share", peer: { entity_id: "H3", nid: "home-H3" }, widget: chatWidget(), topicState: { topics: [], topicId: "general", page: 0, ftOpen: false, ftItems: [] } };
  const feeds = win.parts["topic-strip"].fed.length;
  release();
  await pending;
  await flush();
  assert.equal(old.topicState.topicId, "t4");
  assert.equal(win.parts["topic-strip"].fed.length, feeds, "no paint for the replaced pane");
});

test("file threads bar: toggle fetches the root folder's threads and opens; a row scopes the widget and closes", async () => {
  const win = fakeInbox();
  await WT.sync(win);
  await WT.toggleBar(win);
  assert.deepEqual(win.calls.at(-1), ["channel.file_thread_list_by_folder", { hub_id: "H1", folder_nid: "home-H1", page: 1 }]);
  assert.equal(win.parts["ft-bar"].el.dataset.open, "1");
  assert.match(classes(lastFeed(win, "ft-bar")), /window__ft-row/);
  await WT.pickFile(win, "f1", "Q2");
  const w = win._panes.workspace.widget;
  assert.deepEqual(w.calls.at(-1), ["file", "f1", "Q2"]);
  assert.equal(win.parts["ft-bar"].el.dataset.open, "0");
  // Reopened: the scoped file's row is highlighted.
  await WT.toggleBar(win);
  assert.match(classes(lastFeed(win, "ft-bar")), /window__ft-row is-active/);
});

test("the bar closes on outside pointerdown and Escape (not inside); detach removes the listeners", async () => {
  const win = fakeInbox();
  await WT.sync(win);
  await WT.toggleBar(win);
  fire("pointerdown", { target: "inside" });
  await flush();
  assert.equal(win.parts["ft-bar"].el.dataset.open, "1");
  fire("pointerdown", { target: "outside" });
  await flush();
  assert.equal(win.parts["ft-bar"].el.dataset.open, "0");
  await WT.toggleBar(win);
  fire("keydown", { key: "Escape" });
  await flush();
  assert.equal(win.parts["ft-bar"].el.dataset.open, "0");
  await WT.toggleBar(win);
  WT.detach(win);
  assert.equal((listeners.pointerdown || new Set()).size, 0);
  assert.equal((listeners.keydown || new Set()).size, 0);
});

test("leaving for Direct closes the bar and drops its listeners", async () => {
  const win = fakeInbox();
  await WT.sync(win);
  await WT.toggleBar(win);
  win._scope = "direct";
  await WT.sync(win);
  assert.equal((listeners.pointerdown || new Set()).size, 0);
  win._scope = "workspace";
  await WT.sync(win);
  assert.equal(win.parts["ft-bar"].el.dataset.open, "0");
});

test("+ Topic opens the dialog in its slot with this workspace; create scopes the chat to the new topic", async () => {
  const win = fakeInbox();
  await WT.sync(win);
  await WT.openDialog(win);
  const fed = lastFeed(win, "wrapper-topic-dialog");
  assert.equal(fed.kind, "widget_topic_create");
  assert.equal(fed.hub_id, "H1");
  assert.equal(fed.folder_nid, "home-H1");
  assert.equal(fed.host, win);
  const res = await WT.createTopic(win, { name: "Design", emoji: "🔥" });
  assert.equal(res.ok, true);
  assert.deepEqual(win.calls.at(-1), ["channel.topic_create", { hub_id: "H1", folder_nid: "home-H1", name: "Design", emoji: "🔥" }]);
  assert.equal(win._panes.workspace.widget.scopedTopicId, "t9");
  assert.deepEqual(activeTab(lastFeed(win, "topic-strip")), ["t9"]);
  WT.closeDialog(win);
  assert.equal(lastFeed(win, "wrapper-topic-dialog"), "cleared");
});

test("create refused → {ok:false, status} and the scope is unchanged", async () => {
  const win = fakeInbox();
  await WT.sync(win);
  win.postService = async () => ({ status: "TOPIC_EXISTS" });
  assert.deepEqual(await WT.createTopic(win, { name: "A", emoji: "🎨" }), { ok: false, status: "TOPIC_EXISTS" });
  assert.equal(win._panes.workspace.widget.scopedTopicId, "general");
});

// ── Final review fixes ──
test("closing the bar repaints only the bar: a strip tab pressed while the dropdown is open keeps its DOM", async () => {
  const win = fakeInbox();
  await WT.sync(win);
  await WT.toggleBar(win);
  const strips = win.parts["topic-strip"].fed.length;
  await WT.closeBar(win);
  await WT.toggleBar(win);
  await WT.pickFile(win, "f1", "Q2");
  assert.equal(win.parts["topic-strip"].fed.length, strips, "strip not re-fed by bar open / close / pick");
  assert.equal(win.parts["ft-bar"].el.dataset.open, "0");
});

test("a newly opened workspace paints # General (bar closed) at once, before its topics arrive", async () => {
  let release;
  const win = fakeInbox();
  await WT.sync(win);
  await WT.scopeTopic(win, "t2");
  await WT.toggleBar(win);
  win.fetchService = (name, p) => (win.calls.push([name, p]), new Promise((r) => (release = () => r(TOPICS))));
  win._panes.workspace = { type: "share", peer: { entity_id: "H2", nid: "home-H2" }, widget: chatWidget() };
  const pending = WT.sync(win);
  await flush();
  assert.deepEqual(activeTab(lastFeed(win, "topic-strip")), ["thread-menu-general"], "the old workspace's topic is gone");
  assert.equal(win.parts["ft-bar"].el.dataset.open, "0");
  assert.equal(win.parts["chat-area"].el.dataset.topics, "1");
  release();
  await pending;
  assert.match(classes(lastFeed(win, "topic-strip")), /window__topic-page/);
});

// ── Carousel fills its width (window/folder/topic-fit) ──
test("carousel: the strip is fitted to its width; next moves by what fitted", async () => {
  const win = fakeInbox({ topics: [...TOPICS, { id: "t5", name: "E" }] });
  const widths = [80, 50, 50, 50, 50, 50];
  const tabs = widths.map((wd) => ({ dataset: {}, offsetWidth: wd }));
  const page = { className: "window__topic-page", dataset: {}, children: tabs, clientWidth: 250 };
  const el = { dataset: {}, contains: () => false, querySelector: () => page, querySelectorAll: () => [{ dataset: {} }, { dataset: {} }] };
  win.parts["topic-strip"] = { pn: "topic-strip", el, fed: [], feed(k) { this.fed.push(k); } };
  global.requestAnimationFrame = (f) => f();
  try {
    await WT.sync(win);
    const s = win._panes.workspace.topicState;
    assert.equal(s.count, 4, "4 fit, not 3");
    assert.deepEqual(tabs.map((t) => t.dataset.fit), ["1", "1", "1", "1", "0", "0"]);
    await WT.stripPage(win, +1);
    assert.equal(stripPage_(lastFeed(win, "topic-strip")).dataset.slide, "next");
    // The last page takes tabs back to stay full: t2 · t3 · t4 · t5.
    assert.equal(s.start, 2);
    await WT.stripPage(win, -1);
    assert.equal(s.start, 0);
  } finally {
    delete global.requestAnimationFrame;
  }
});
