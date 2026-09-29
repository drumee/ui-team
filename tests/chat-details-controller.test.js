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
global._a = { hub_id: "hub_id", actual_hub_id: "actual_hub_id", privilege: "privilege", headless: "headless" };
global.KIND = { profile: "profile" };
global.bootstrap = () => ({ endpoint: "/-/", keysel: "k" });
global.SERVICE = {
  channel: { details: "channel.details", media_list: "channel.media_list" },
  activity: { mute_state: "activity.mute_state", mute_set: "activity.mute_set" },
};

const C = require("../src/drumee/builtins/widget/chat-details/engine");
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

function fakeWindow({ canChat = true, attrs = {} } = {}) {
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
    mget: (k) => ({ hub_id: "h1", privilege: canChat ? 7 : 1, ...attrs })[k],
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
  // First paint is the loading skeleton, never "0 photos" / no members.
  assert.ok(walk(w.panel.fed[0]).some((n) => /window__chat-details-skeleton/.test(n.className || "")));
  assert.ok(!texts(w.panel.fed[0]).some((x) => /photos/.test(`${x}`)));
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

// Clicking a tile / file / link row shows a loading state on THAT item until
// the open settles — openFileLocation awaits a fetch and the player launch.
const item = () => ({ el: { dataset: {} } });

test("openItem: loading while the open runs, cleared when it settles", async () => {
  const w = fakeWindow();
  const cmd = item();
  const d = deferred();
  const p = C.openItem(w, cmd, () => d.promise, { minMs: 0 });
  assert.equal(cmd.el.dataset.loading, "1");
  d.resolve();
  await p;
  assert.equal(cmd.el.dataset.loading, "0");
});

test("openItem: a second click while loading does not open again", async () => {
  const w = fakeWindow();
  const cmd = item();
  const d = deferred();
  let runs = 0;
  const run = () => { runs++; return d.promise; };
  const p = C.openItem(w, cmd, run, { minMs: 0 });
  await C.openItem(w, cmd, run, { minMs: 0 });
  assert.equal(runs, 1);
  d.resolve();
  await p;
});

test("openItem: a failing or throwing open still clears the loading state", async () => {
  const w = fakeWindow();
  const a = item();
  await C.openItem(w, a, () => Promise.reject(new Error("404")), { minMs: 0 });
  assert.equal(a.el.dataset.loading, "0");
  const b = item();
  await C.openItem(w, b, () => { throw new Error("boom"); }, { minMs: 0 });
  assert.equal(b.el.dataset.loading, "0");
});

test("openItem: an open that never settles is released by the safety timeout", async () => {
  const w = fakeWindow();
  const cmd = item();
  await C.openItem(w, cmd, () => new Promise(() => {}), { minMs: 0, maxMs: 10 });
  assert.equal(cmd.el.dataset.loading, "0");
});

test("openItem: a quick open keeps the spinner up for the minimum time", async () => {
  const w = fakeWindow();
  const cmd = item();
  const t0 = Date.now();
  await C.openItem(w, cmd, () => undefined, { minMs: 60 });
  assert.ok(Date.now() - t0 >= 55, `cleared after ${Date.now() - t0}ms`);
  assert.equal(cmd.el.dataset.loading, "0");
});

// Meeting tile → start / join this room's call AND light the desk rail's Meet
// row (Desk._railHighlight), the way a rail click would — but only when the
// launch went ahead, and only for the docked workspace pane the rail stands for.
const meetWin = (opts = {}) => {
  const { headless = 1, joined = false } = opts;
  // An explicit `launched: undefined` must stay undefined — it is what
  // _launchMeetingStandalone returns when another call blocks the launch.
  const launched = "launched" in opts ? opts.launched : true;
  const w = fakeWindow({ attrs: { headless } });
  w.launches = 0;
  w._meetingJoined = joined ? 1 : 0;
  w._launchMeetingInPanel = () => { w.launches++; return launched; };
  return w;
};
const desk = () => ({ lit: [], _railHighlight(tab) { this.lit.push(tab); } });

test("startMeeting: launches and lights the rail's Meet row", () => {
  const w = meetWin();
  const d = desk();
  assert.equal(C.startMeeting(w, d), true);
  assert.equal(w.launches, 1);
  assert.deepEqual(d.lit, ["meeting"]);
});

test("startMeeting: a refused launch (another call up) leaves the rail alone", () => {
  const w = meetWin({ launched: undefined });
  const d = desk();
  C.startMeeting(w, d);
  assert.deepEqual(d.lit, []);
});

test("startMeeting: a floating folder window never touches the desk rail", () => {
  const d = desk();
  C.startMeeting(meetWin({ headless: 0 }), d);
  assert.deepEqual(d.lit, []);
});

test("startMeeting: already joined → nothing launches, nothing lights", () => {
  const w = meetWin({ joined: true });
  const d = desk();
  assert.equal(C.startMeeting(w, d), false);
  assert.equal(w.launches, 0);
  assert.deepEqual(d.lit, []);
});

test("startMeeting: no desk (DMZ / share) is fine", () => {
  assert.equal(C.startMeeting(meetWin(), undefined), true);
});
