// chat-details-controller.test.js — open / close / page / mute for the folder
// window's Chat details panel, driven against a fake window.
//
//   node --test tests/chat-details-controller.test.js
//
// The folder window only delegates here, so this is where the panel's
// behaviour is pinned: the chat gate, the split-body stamp, the one round trip,
// and — the one that bites — a response that lands after the user closed or
// re-opened the panel must never paint.
const test = require("node:test");
const assert = require("node:assert/strict");
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
global._a = { hub_id: "hub_id", actual_hub_id: "actual_hub_id", privilege: "privilege" };
global.KIND = { profile: "profile" };
global.bootstrap = () => ({ endpoint: "/-/", keysel: "k" });
global.SERVICE = {
  channel: { details: "channel.details", media_list: "channel.media_list" },
  activity: { mute_state: "activity.mute_state", mute_set: "activity.mute_set" },
};

const C = require("../src/drumee/builtins/window/folder/chat-details/controller");
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

function fakeWindow({ canChat = true } = {}) {
  const panel = { el: { dataset: {} }, fed: [], feed(k) { this.fed.push(k); } };
  const view = { el: { dataset: {} } };
  const pending = [];
  const win = {
    panel,
    view,
    pending,
    requests: [],
    posts: [],
    ensured: [],
    threadMenuClosed: 0,
    __folderView: view,
    fig: { group: "window", family: "window-folder" },
    mget: (k) => ({ hub_id: "h1", privilege: canChat ? 7 : 1 })[k],
    _privilegeGrantsChat: () => canChat,
    _closeThreadMenu() { this.threadMenuClosed++; },
    _fetchThreadList: () => Promise.resolve([{ file_nid: "f1", filename: "Spec" }]),
    ensurePart(pn) { this.ensured.push(pn); return Promise.resolve(panel); },
    fetchService(args) {
      // mute.js calls fetchService(svc, params); the controller calls ({service,...}).
      const service = typeof args === "string" ? args : args.service;
      this.requests.push(typeof args === "string" ? { service } : args);
      if (service === "activity.mute_state") return Promise.resolve({ global: 0, hubs: [] });
      const d = deferred();
      pending.push({ args, ...d });
      return d.promise;
    },
    postService(svc, params) {
      this.posts.push([svc, params]);
      return Promise.resolve(this.muteReply);
    },
  };
  return win;
}

test.beforeEach(() => Mute.resetMuteState());

test("gated viewer: nothing is fetched and nothing opens", async () => {
  const w = fakeWindow({ canChat: false });
  await C.open(w);
  assert.deepEqual(w.ensured, []);
  assert.deepEqual(w.requests, []);
  assert.equal(w.view.el.dataset.details, undefined);
});

test("open: stamps the split body, paints at once, then fills from one details call", async () => {
  const w = fakeWindow();
  const done = C.open(w);
  await flush();
  assert.equal(w.view.el.dataset.details, "open");
  assert.equal(w.panel.el.dataset.page, "overview");
  assert.equal(w.threadMenuClosed, 1);
  assert.equal(w.panel.fed.length, 1);
  const call = w.pending.find((p) => p.args.service === "channel.details");
  assert.deepEqual(call.args, { service: "channel.details", hub_id: "h1" });
  call.resolve({ stats: { photos: 3, videos: 0, files: 1, links: 2 }, members: [{ id: "a", fullname: "Ann", online: 1 }] });
  await done;
  const tx = texts(w.panel.fed.at(-1));
  assert.ok(tx.includes("3 photos"));
  assert.ok(tx.includes("Spec"));
  assert.ok(tx.includes("Ann"));
});

test("a details response that lands after a re-open never paints", async () => {
  const w = fakeWindow();
  const first = C.open(w);
  await flush();
  const second = C.open(w);
  await flush();
  const [p1, p2] = w.pending.filter((p) => p.args.service === "channel.details");
  p2.resolve({ stats: { photos: 9 }, members: [] });
  await second;
  const fedAfterSecond = w.panel.fed.length;
  p1.resolve({ stats: { photos: 1 }, members: [] });
  await first;
  assert.equal(w.panel.fed.length, fedAfterSecond);
  assert.ok(texts(w.panel.fed.at(-1)).includes("9 photos"));
});

test("close: unstamps, empties the panel, and drops the in-flight response", async () => {
  const w = fakeWindow();
  const opened = C.open(w);
  await flush();
  C.close(w);
  assert.equal(w.view.el.dataset.details, "closed");
  assert.deepEqual(w.panel.fed.at(-1), []);
  const fed = w.panel.fed.length;
  w.pending[0].resolve({ stats: { photos: 5 }, members: [] });
  await opened;
  assert.equal(w.panel.fed.length, fed);
});

test("page: loading first, then the rows for that kind; stale page ignored", async () => {
  const w = fakeWindow();
  const o = C.open(w);
  await flush();
  w.pending[0].resolve({ stats: {}, members: [] });
  await o;
  const photos = C.showPage(w, "photo");
  const links = C.showPage(w, "link");
  assert.equal(w.panel.el.dataset.page, "link");
  const [pPhoto, pLink] = w.pending.slice(1);
  assert.deepEqual(pPhoto.args, { service: "channel.media_list", hub_id: "h1", kind: "photo", page: 1 });
  pLink.resolve([{ message_id: "m1", preview: "see", url: "https://x.io" }]);
  await links;
  const fed = w.panel.fed.length;
  pPhoto.resolve([{ nid: "i1", category: "image" }]);
  await photos;
  assert.equal(w.panel.fed.length, fed);
  assert.ok(texts(w.panel.fed.at(-1)).includes("https://x.io"));
});

test("page: back to overview repaints the cached overview without refetching", async () => {
  const w = fakeWindow();
  const o = C.open(w);
  await flush();
  w.pending[0].resolve({ stats: { photos: 4 }, members: [] });
  await o;
  const before = w.requests.length;
  C.showPage(w, "overview");
  assert.equal(w.requests.length, before);
  assert.ok(texts(w.panel.fed.at(-1)).includes("4 photos"));
  C.showPage(w, "bogus");
  assert.equal(w.panel.el.dataset.page, "overview");
});

// The panel is its own scroll container and survives every feed. A user who
// scrolled the overview down to reach "175 files" landed on a long list still
// scrolled down, with the header — and its back arrow — out of view above.
test("every page switch, back included, starts at the top", async () => {
  const w = fakeWindow();
  const o = C.open(w);
  await flush();
  w.pending[0].resolve({ stats: { files: 3 }, members: [] });
  await o;
  w.panel.el.scrollTop = 400;
  const files = C.showPage(w, "file");
  assert.equal(w.panel.el.scrollTop, 0);
  w.pending.at(-1).resolve([{ nid: "d1", category: "document", filename: "a.docx" }]);
  await files;
  assert.equal(w.panel.el.scrollTop, 0);
  w.panel.el.scrollTop = 250;
  C.showPage(w, "overview");
  assert.equal(w.panel.el.scrollTop, 0);
});

test("mute: posts this hub, repaints Unmute only when the server confirms", async () => {
  const w = fakeWindow();
  const o = C.open(w);
  await flush();
  w.pending[0].resolve({ stats: {}, members: [] });
  await o;
  w.muteReply = { status: "failed" };
  await C.toggleMute(w);
  assert.deepEqual(w.posts[0], ["activity.mute_set", { hub_id: "h1", muted: 1 }]);
  assert.ok(!texts(w.panel.fed.at(-1)).includes(en.CD_UNMUTE));
  w.muteReply = { status: "ok", global: 0, hubs: ["h1"] };
  await C.toggleMute(w);
  assert.ok(texts(w.panel.fed.at(-1)).includes(en.CD_UNMUTE));
});
