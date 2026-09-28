// chat-details-skeleton.test.js — the Chat details overview and its four
// drill-down pages (Figma 775:131699, 775:132297..132300).
//
//   node --test tests/chat-details-skeleton.test.js
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
global._a = { hub_id: "hub_id", actual_hub_id: "actual_hub_id" };
global.KIND = { profile: "profile" };
global.bootstrap = () => ({ endpoint: "/-/", keysel: "k" });

const S = require("../src/drumee/builtins/window/folder/skeleton/chat-details");
const ui = { fig: { group: "window", family: "window-folder" }, mget: (k) => ({ hub_id: "h1" })[k] };
const walk = (n, out = []) => {
  if (Array.isArray(n)) { n.forEach((k) => walk(k, out)); return out; }
  if (!n || typeof n !== "object") return out;
  out.push(n);
  (n.kids || []).forEach((k) => walk(k, out));
  return out;
};
const byService = (t, s) => walk(t).filter((n) => n.service === s);
const texts = (t) => walk(t).filter((n) => n.type === "Note").map((n) => n.content);

const data = {
  stats: { photos: 752, videos: 33, files: 175, links: 721 },
  threads: [
    { file_nid: "f1", user_filename: "Drumee_Strategy_Q2" },
    { file_nid: "f2", filename: "Visual02", unread: 34 },
  ],
  members: [
    { id: "a", fullname: "Lucas Zoe", online: 1 },
    { id: "b", fullname: "Jullie", online: 0, last_seen: 0 },
    { id: "a", fullname: "Lucas Zoe", online: 1 },
  ],
  muted: false,
};

test("overview: title, three actions, threads, four counts, members", () => {
  const t = S.chatDetailsOverview(ui, data);
  const tx = texts(t);
  assert.ok(tx.includes(en.CD_CHAT_DETAILS));
  assert.equal(byService(t, "close-chat-details").length, 1);
  assert.deepEqual(
    ["chat-details-mute", "chat-details-meeting", "chat-details-download"].map((s) => byService(t, s).length),
    [1, 1, 1],
  );
  assert.ok(tx.includes(en.MUTE));
  assert.deepEqual(byService(t, "chat-details-thread").map((n) => n.file_nid), ["f1", "f2"]);
  assert.ok(tx.includes("34"));
  assert.deepEqual(byService(t, "chat-details-page").map((n) => n.page), ["photo", "video", "file", "link"]);
  assert.ok(tx.includes("752 photos") && tx.includes("721 shared links"));
  assert.ok(tx.includes("2 members"));
  assert.equal(tx.filter((x) => x === "Lucas Zoe").length, 1);
  assert.deepEqual(walk(t).filter((n) => n.kind === "profile").map((n) => n.id), ["a", "b"]);
});

test("overview: muted flips the label, no threads hides the section", () => {
  const t = S.chatDetailsOverview(ui, { ...data, muted: true, threads: [] });
  assert.ok(texts(t).includes(en.CD_UNMUTE));
  assert.ok(!texts(t).includes(en.FILE_THREADS));
});

test("photo page: back + close, one tile per row carrying nid", () => {
  const t = S.chatDetailsPage(ui, "photo", [{ nid: "i1", category: "image" }, { nid: "i2", category: "vector" }]);
  assert.equal(byService(t, "chat-details-back").length, 1);
  assert.equal(byService(t, "close-chat-details").length, 1);
  assert.deepEqual(byService(t, "chat-details-open-media").map((n) => n.nid), ["i1", "i2"]);
  const imgs = walk(t).filter((n) => n.type === "Image.Smart").map((n) => n.low);
  assert.deepEqual(imgs, ["/-/file/vignette/i1/h1?keysel=k", "/-/file/orig/i2/h1?keysel=k"]);
  assert.ok(texts(t).includes(en.CD_PHOTOS_TITLE));
});

test("video page groups by month with a duration pill", () => {
  const ct = dayjs().startOf("month").add(2, "day").unix();
  const t = S.chatDetailsPage(ui, "video", [{ nid: "v1", category: "video", duration: 32, ctime: ct }]);
  assert.ok(texts(t).includes(dayjs.unix(ct).format("MMMM")));
  assert.ok(texts(t).includes("0:32"));
});

test("link page: message + url, clicking carries the url", () => {
  const t = S.chatDetailsPage(ui, "link", [{ message_id: "m6", preview: "see x", url: "https://x.io/a" }]);
  assert.deepEqual(byService(t, "chat-details-open-link").map((n) => n.url), ["https://x.io/a"]);
  assert.ok(texts(t).includes("https://x.io/a"));
});

test("empty page shows the empty note, never a blank card", () => {
  const t = S.chatDetailsPage(ui, "file", []);
  assert.ok(texts(t).includes(en.CD_NOTHING_YET));
});
