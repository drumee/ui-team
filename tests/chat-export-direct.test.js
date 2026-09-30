// chat-export-direct.test.js — widget_chat_export for a DIRECT conversation:
// p2p scope + export services on the viewer's own hub, a person card, no
// folder / thread scope picker; the fetch URL uses the viewer's hub.
//   node --test tests/chat-export-direct.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");
const node = (type) => (opt = {}) => ({ type, ...opt });
global.Skeletons = { Box: { X: node("Box.X"), Y: node("Box.Y") }, List: { Scroll: node("List.Scroll") }, Note: node("Note"), Element: node("Element"), Image: { Svg: node("Image.Svg") }, Button: { Svg: node("Button.Svg") }, Entry: node("Entry") };
const en = require("../locale/en.json");
global.LOCALE = new Proxy(en, { get: (t, k) => (k in t ? t[k] : k) });
global._ = require("underscore");
global._a = new Proxy({}, { get: (t, k) => k });
global._e = new Proxy({}, { get: (t, k) => k });
global.KIND = { profile: "profile" };
global.Visitor = { id: "me0000000000000a" };
global.bootstrap = () => ({ svc: "/-/svc/", keysel: "k" });
global.SERVICE = { channel: { export_scope: "channel.export_scope", export: "channel.export", export_fetch: "channel.export_fetch" }, chat: { p2p_export_scope: "chat.p2p_export_scope", p2p_export: "chat.p2p_export" } };
global.LetcBox = class { initialize() {} declareHandlers() {} bindEvent() {} warn() {} };
const _load = Module._load;
Module._load = function (r, ...a) {
  if (r === "./skin" || /date-row-ready$/.test(r)) return { watchDateRowReady() {} };
  return _load.call(this, r, ...a);
};
const W = require("../src/drumee/builtins/widget/chat-export");
const sk = require("../src/drumee/builtins/widget/chat-export/skeleton").default;
const walk = (n, out = []) => { if (Array.isArray(n)) { n.forEach((k) => walk(k, out)); return out; } if (!n || typeof n !== "object") return out; out.push(n); (n.kids || []).forEach((k) => walk(k, out)); return out; };

function widget(attrs) {
  const w = Object.create(W.prototype);
  w.mget = (k) => attrs[k];
  w.mset = () => {};
  w.fig = { family: "widget-chat-export" };
  w.feed = () => {};
  w.calls = [];
  w.fetchService = async (svc, p) => (w.calls.push([svc, p]), { hub: { name: "Ann Peer", message_count: 12, mtime: null }, folders: [], file_threads: [] });
  w.postService = async (svc, p) => (w.calls.push([svc, p]), { wait: 0, zipid: "z1", zipname: "Ann_Peer.json", format: "json" });
  w._triggerDownload = (d) => w.calls.push(["download", d]);
  W.prototype.initialize.call(w, attrs);
  return w;
}

test("direct: scope from chat.p2p_export_scope on the viewer's hub", async () => {
  const w = widget({ mode: "direct", peer_id: "peer", hub_id: "me0000000000000a", name: "Ann Peer" });
  await w._loadScope();
  assert.deepEqual(w.calls[0], ["chat.p2p_export_scope", { hub_id: "me0000000000000a", peer_id: "peer" }]);
  assert.equal(w._messageCount, 12);
});

test("direct: export posts chat.p2p_export with only format and dates", async () => {
  const w = widget({ mode: "direct", peer_id: "peer", hub_id: "me0000000000000a" });
  await w._doExport();
  const [svc, p] = w.calls.find((c) => c[0] === "chat.p2p_export");
  assert.equal(svc, "chat.p2p_export");
  assert.deepEqual(Object.keys(p).sort(), ["end_date", "format", "hub_id", "peer_id", "start_date"]);
  assert.equal(p.peer_id, "peer");
  assert.equal(w.calls.at(-1)[0], "download");
  assert.match(w._exportFetchUrl({ zipid: "z1", zipname: "a.json" }), /hub_id=me0000000000000a&zipid=z1/);
});

test("direct: a person card, no folder / thread scope picker", () => {
  const w = widget({ mode: "direct", peer_id: "peer", hub_id: "me0000000000000a", name: "Ann Peer" });
  w._hubName = "Ann Peer";
  const t = sk(w);
  const cls = walk(t).map((n) => n.className || "");
  assert.ok(cls.some((c) => /__peer-card/.test(c)));
  // No folder / thread scope rows, and no workspace art (folder card only).
  assert.ok(!cls.some((c) => /__scope-row/.test(c)));
  assert.ok(!cls.some((c) => /__folder-art/.test(c)));
  assert.ok(walk(t).some((n) => n.kind === "profile" && n.id === "peer"));
});

test("workspace mode is unchanged", async () => {
  const w = widget({ hub_id: "h1", nid: "n1" });
  await w._loadScope();
  assert.deepEqual(w.calls[0], ["channel.export_scope", { hub_id: "h1", nid: "n1" }]);
});

// The footer hints describe the file: a DM has no folder / thread sections,
// and chat.p2p_export names it after the person (<name>.<format>, sanitised
// as the server does).
test("direct: footer names the DM file, no folder / thread sections hint", () => {
  const w = widget({ mode: "direct", peer_id: "peer", hub_id: "me0000000000000a", name: "Ann Peer" });
  w._hubName = "Ann Peer";
  const notes = walk(sk(w)).filter((n) => n.type === "Note").map((n) => n.content);
  assert.ok(!notes.includes(en.EXPORT_FILE_SECTIONS_HINT));
  assert.ok(!notes.includes(en.EXPORT_FILENAME_HINT));
  assert.ok(notes.includes("Ann_Peer.(pdf|json)"));
});
