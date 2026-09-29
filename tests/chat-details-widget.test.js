// chat-details-widget.test.js — widget_chat_details, the reusable Chat details
// panel: workspace and direct modes, the host contract, stale responses and
// paging. Driven with a fake host and a fake fetchService.
//
//   node --test tests/chat-details-widget.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");
const dayjs = require("dayjs");
dayjs.extend(require("dayjs/plugin/relativeTime"));
global.Dayjs = dayjs;
const node = (type) => (opt = {}) => ({ type, ...opt });
global.Skeletons = {
  Box: { X: node("Box.X"), Y: node("Box.Y") },
  Note: node("Note"),
  Image: { Svg: node("Image.Svg"), Smart: node("Image.Smart") },
  Button: { Svg: node("Button.Svg") },
};
const en = require("../locale/en.json");
global.LOCALE = new Proxy(en, { get: (t, k) => (k in t ? t[k] : k) });
String.prototype.format = function (...a) {
  return String(this).replace(/\{(\d+)\}/g, (_, i) => a[i]);
};
global._ = require("underscore");
global._a = new Proxy({}, { get: (t, k) => k });
global._K = { permission: { download: 4 } };
global.KIND = { profile: "profile" };
global.bootstrap = () => ({ endpoint: "/-/", keysel: "" });
global.Visitor = { id: "me0000000000000a" };
global.SERVICE = {
  channel: { details: "channel.details", media_list: "channel.media_list" },
  chat: { p2p_details: "chat.p2p_details", p2p_media_list: "chat.p2p_media_list" },
  activity: { mute_state: "activity.mute_state", mute_set: "activity.mute_set" },
};
global.LetcBox = class {};
const MAP = require("../src/drumee/builtins/media/template/map");
const _load = Module._load;
Module._load = function (r, ...a) {
  if (r === "./skin") return {};
  if (r === "media/template/map") return MAP;
  return _load.call(this, r, ...a);
};

const W = require("../src/drumee/builtins/widget/chat-details");
const Mute = require("../src/drumee/builtins/panel/activity/mute");

const deferred = () => {
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
};
const flush = () => new Promise((r) => setImmediate(r));
const walk = (n, out = []) => {
  if (Array.isArray(n)) { n.forEach((k) => walk(k, out)); return out; }
  if (!n || typeof n !== "object") return out;
  out.push(n);
  (n.kids || []).forEach((k) => walk(k, out));
  return out;
};
const texts = (t) => walk(t).filter((n) => n.type === "Note").map((n) => n.content);
const byService = (t, s) => walk(t).filter((n) => n.service === s);

function widget(opts, host = fakeHost()) {
  const w = Object.create(W.prototype);
  const attrs = { ...opts };
  w.mget = (k) => attrs[k];
  w.cdPrefix = "widget-chat-details";
  w.cdMode = opts.mode;
  w.host = host;
  w.fig = { family: "widget-chat-details", group: "widget" };
  w.el = { dataset: {}, scrollTop: 0, querySelector: () => null };
  w.fed = [];
  w.feed = (k) => w.fed.push(k);
  w.pending = [];
  w.requests = [];
  w.fetchService = (args) => {
    const service = typeof args === "string" ? args : args.service;
    w.requests.push(typeof args === "string" ? { service } : args);
    if (service === "activity.mute_state") return Promise.resolve({ global: 0, hubs: [] });
    const d = deferred();
    w.pending.push({ args, ...d });
    return d.promise;
  };
  w.postService = () => Promise.resolve({ status: "ok", global: 0, hubs: [] });
  return w;
}
function fakeHost() {
  return {
    actions: [],
    chatDetailsAction(name, payload) { this.actions.push([name, payload]); return Promise.resolve(); },
    chatDetailsThreads: () => Promise.resolve([{ file_nid: "f1", filename: "Spec" }]),
  };
}
const cmd = (attrs) => ({ el: { dataset: {} }, mget: (k) => attrs[k] });

test.beforeEach(() => Mute.resetMuteState());

test("direct: asks chat.p2p_details for the peer; no threads, mute or download; participants", async () => {
  const w = widget({ mode: "direct", peer_id: "peer" });
  const o = w.open();
  await flush();
  const call = w.pending.find((p) => p.args.service === "chat.p2p_details");
  assert.deepEqual(call.args, { service: "chat.p2p_details", peer_id: "peer", hub_id: "me0000000000000a" });
  call.resolve({ stats: { photos: 2, files: 1 }, members: [{ id: "me", fullname: "Me", online: 1 }, { id: "peer", fullname: "Peer", online: 0 }] });
  await o;
  const t = w.fed.at(-1);
  assert.equal(byService(t, "chat-details-thread").length, 0);
  assert.equal(byService(t, "chat-details-mute").length, 0);
  assert.equal(byService(t, "chat-details-download").length, 0);
  assert.equal(byService(t, "chat-details-meeting").length, 1);
  assert.ok(texts(t).includes(en.CD_PARTICIPANTS));
  assert.ok(texts(t).includes("2 photos"));
  assert.ok(!w.requests.some((r) => r.service === "activity.mute_state"));
});

test("workspace: asks channel.details for the hub, threads come from the host", async () => {
  const w = widget({ mode: "workspace", hub_id: "h1", privilege: 7 });
  const o = w.open();
  await flush();
  const call = w.pending.find((p) => p.args.service === "channel.details");
  assert.deepEqual(call.args, { service: "channel.details", hub_id: "h1" });
  call.resolve({ stats: {}, members: [] });
  await o;
  const t = w.fed.at(-1);
  assert.deepEqual(byService(t, "chat-details-thread").map((n) => n.file_nid), ["f1"]);
  assert.equal(byService(t, "chat-details-mute").length, 1);
  assert.equal(byService(t, "chat-details-download").length, 1);
});

test("workspace: a viewer without chat access gets nothing fetched", async () => {
  const w = widget({ mode: "workspace", hub_id: "h1", privilege: 1 });
  await w.open();
  assert.deepEqual(w.requests, []);
});

test("every host-bound click reaches host.chatDetailsAction with its payload", async () => {
  const host = fakeHost();
  const w = widget({ mode: "workspace", hub_id: "h1", privilege: 7 }, host);
  await w.onUiEvent(cmd({ service: "close-chat-details" }), { service: "close-chat-details" });
  await w.onUiEvent(cmd({}), { service: "chat-details-meeting" });
  await w.onUiEvent(cmd({}), { service: "chat-details-download" });
  await w.onUiEvent(cmd({ file_nid: "f1", filename: "Spec" }), { service: "chat-details-thread" });
  await w.onUiEvent(cmd({ nid: "n1", hub_id: "hX", filetype: "image", filename: "a.png" }), { service: "chat-details-open-media" });
  assert.deepEqual(host.actions, [
    ["close", {}],
    ["meeting", {}],
    ["download", {}],
    ["thread", { file_nid: "f1", filename: "Spec" }],
    ["open-media", { nid: "n1", hub_id: "hX", filetype: "image", filename: "a.png" }],
  ]);
});

test("open-media without a row hub falls back to the widget's hub", async () => {
  const host = fakeHost();
  const w = widget({ mode: "workspace", hub_id: "h1", privilege: 7 }, host);
  await w.onUiEvent(cmd({ nid: "n1", filetype: "image", filename: "a.png" }), { service: "chat-details-open-media" });
  assert.equal(host.actions[0][1].hub_id, "h1");
});

test("a details response for a previous open never paints", async () => {
  const w = widget({ mode: "direct", peer_id: "peer" });
  const first = w.open();
  await flush();
  const second = w.open();
  await flush();
  const [p1, p2] = w.pending.filter((p) => p.args.service === "chat.p2p_details");
  p2.resolve({ stats: { photos: 9 }, members: [] });
  await second;
  const fed = w.fed.length;
  p1.resolve({ stats: { photos: 1 }, members: [] });
  await first;
  assert.equal(w.fed.length, fed);
  assert.ok(texts(w.fed.at(-1)).includes("9 photos"));
});

test("direct pages come from chat.p2p_media_list", async () => {
  const w = widget({ mode: "direct", peer_id: "peer" });
  const o = w.open();
  await flush();
  w.pending[0].resolve({ stats: {}, members: [] });
  await o;
  w.showPage("file");
  assert.deepEqual(w.pending.at(-1).args, {
    service: "chat.p2p_media_list", peer_id: "peer", hub_id: "me0000000000000a", kind: "file", page: 1,
  });
});

// A count can be in the hundreds while one media_list page holds 60 (links
// 30): the page must keep loading as the user scrolls, not silently stop.
const onPhotos = async () => {
  const w = widget({ mode: "workspace", hub_id: "h1", privilege: 7 });
  const o = w.open();
  await flush();
  w.pending[0].resolve({ stats: {}, members: [] });
  await o;
  const p = w.showPage("photo");
  w.pending.at(-1).resolve(Array.from({ length: 60 }, (_, i) => ({ nid: `i${i}`, category: "image" })));
  await p;
  return w;
};
const tiles = (t) => byService(t, "chat-details-open-media").length;

test("loadMore: a full page asks for the next one and appends it; a short page ends the list", async () => {
  const w = await onPhotos();
  assert.equal(tiles(w.fed.at(-1)), 60);
  const more = w.loadMore();
  assert.deepEqual(w.pending.at(-1).args, { service: "channel.media_list", hub_id: "h1", kind: "photo", page: 2 });
  w.loadMore(); // in flight: ignored
  assert.equal(w.pending.filter((p) => p.args.page === 2).length, 1);
  w.pending.at(-1).resolve([{ nid: "last", category: "image" }]);
  await more;
  assert.equal(tiles(w.fed.at(-1)), 61);
  const asked = w.requests.length;
  await w.loadMore();
  assert.equal(w.requests.length, asked);
});

test("loadMore: a page that lands after the user left the page never paints", async () => {
  const w = await onPhotos();
  const more = w.loadMore();
  w.showPage("overview");
  const fed = w.fed.length;
  w.pending.find((p) => p.args.page === 2).resolve([{ nid: "late", category: "image" }]);
  await more;
  assert.equal(w.fed.length, fed);
});

test("scrolling the page body near its end loads more; anywhere else does not", async () => {
  const w = await onPhotos();
  const body = { scrollTop: 0, clientHeight: 500, scrollHeight: 2000 };
  w.onBodyScroll(body);
  assert.equal(w.pending.filter((p) => p.args.page === 2).length, 0);
  body.scrollTop = 1350;
  w.onBodyScroll(body);
  assert.equal(w.pending.filter((p) => p.args.page === 2).length, 1);
});
