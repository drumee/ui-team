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
global._a = { hub_id: "hub_id", actual_hub_id: "actual_hub_id", token: "token", privilege: "privilege" };
global.KIND = { profile: "profile" };
global._K = { permission: { download: 4 } };
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

const win = (attrs, family = "window-folder") => ({
  fig: { group: "window", family },
  mget: (k) => attrs[k],
});

test("panel part: folder window only, never on a share-token window", () => {
  const p = S.chatDetailsPanel(win({ privilege: 7 }));
  assert.equal(p.className, "window__chat-details");
  assert.equal(p.sys_pn, "chat-details");
  assert.equal(p.dataset.page, "overview");
  assert.equal(p.dataset.chat_gated, 0);
  assert.equal(S.chatDetailsPanel(win({ privilege: 1 })).dataset.chat_gated, 1);
  assert.equal(S.chatDetailsPanel(win({ privilege: 7, token: "tk" })), null);
  assert.equal(S.chatDetailsPanel(win({ privilege: 7 }, "window-sharebox")), null);
});

test("⋮ opens details on a workspace, the thread menu on a share-token window", () => {
  assert.equal(S.headerMenuService(win({})), "open-chat-details");
  assert.equal(S.headerMenuService(win({ token: "tk" })), "open-thread-menu");
  assert.equal(S.headerMenuService(win({}, "window-sharebox")), "open-thread-menu");
});

test("icons match Figma's outline set (BellRinging, VideoCamera, DownloadSimple, thin X)", () => {
  const t = S.chatDetailsOverview(ui, data);
  const ico = (svc) => walk(byService(t, svc)).find((n) => n.ico).ico;
  assert.equal(ico("chat-details-mute"), "top-bell");
  assert.equal(ico("chat-details-meeting"), "noti-video-camera");
  assert.equal(ico("chat-details-download"), "dl-download-simple");
  assert.equal(byService(t, "close-chat-details")[0].ico, "meet-x");
  const page = S.chatDetailsPage(ui, "file", []);
  assert.equal(byService(page, "close-chat-details")[0].ico, "meet-x");
});

// Files page: each row's tile shows its file type (same mapping and palette as
// the Trash panel / Figma file grid), not one generic glyph.
test("file rows draw a per-type icon and tone", () => {
  const rows = [
    ["Q1 Campaign Assets.docx", "docx", "document"],
    ["Product Roadmap H2.xlsx", "xlsx", "document"],
    ["Brand Guidelines 2026.pdf", "pdf", "pdf"],
    ["Investor Pitch Deck - Draft.pptx", "pptx", "document"],
    ["meeting notes", "", "note"],
    ["release.zip", "zip", "other"],
    ["track.mp3", "mp3", "audio"],
    ["mystery.bin", "bin", "other"],
  ].map(([filename, extension, category], i) => ({ nid: `f${i}`, filename, extension, category }));
  const t = S.chatDetailsPage(ui, "file", rows);
  const tiles = walk(t).filter((n) => /chat-details-file-ico(\s|$)/.test(n.className || ""));
  const got = tiles.map((n) => [n.className.match(/--([a-z]+)/)[1], walk(n).find((k) => k.ico).ico]);
  assert.deepEqual(got, [
    ["text", "ph-file-text"],
    ["sheet", "ph-table"],
    ["pdf", "ph-file-pdf"],
    ["slides", "ph-presentation"],
    ["note", "ph-note-pencil"],
    ["other", "ph-file-zip"],
    ["media", "ph-file-audio"],
    ["other", "ph-file"],
  ]);
});

// The thread rows sit in their own list box (scrolls under a fixed label).
test("thread rows live in a scrollable list under the File Threads label", () => {
  const t = S.chatDetailsOverview(ui, data);
  const list = walk(t).find((n) => n.className === "window__chat-details-thread-list");
  assert.ok(list, "missing thread-list");
  assert.deepEqual(list.kids.map((k) => k.file_nid), ["f1", "f2"]);
});
