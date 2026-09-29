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

// webpack alias used by libs/file-meta chipGlyph — map it to the real module
// so the test sees the same glyphs the app does.
const Module = require("node:module");
const MAP = require("../src/drumee/builtins/media/template/map");
const _load = Module._load;
Module._load = function (request, ...rest) {
  if (request === "media/template/map") return MAP;
  return _load.call(this, request, ...rest);
};
const S = require("../src/drumee/builtins/widget/chat-details/skeleton");
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

// Files page: each row's tile shows the SAME glyph a chat attachment chip
// shows for that file (libs/file-meta chipGlyph) — office types keep their
// coloured raw icons, everything else the flat app-* family.
test("file rows use the chat attachment glyphs", () => {
  const rows = [
    ["Q1 Campaign Assets.docx", "docx"],
    ["Product Roadmap H2.xlsx", "xlsx"],
    ["Investor Pitch Deck - Draft.pptx", "pptx"],
    ["Brand Guidelines 2026.pdf", "pdf"],
    ["readme.md", "md"],
    ["notes.txt", "txt"],
    ["track.mp3", "mp3"],
    ["release.zip", "zip"],
    ["no extension", ""],
  ].map(([filename, extension], i) => ({ nid: `f${i}`, filename, extension, category: "document" }));
  const t = S.chatDetailsPage(ui, "file", rows);
  const tiles = walk(t).filter((n) => /chat-details-file-ico(\s|$)/.test(n.className || ""));
  assert.deepEqual(tiles.map((n) => walk(n).find((k) => k.ico).ico), [
    "raw-documents_word",
    "raw-documents_excel",
    "raw-documents_powerpoint",
    "raw-documents_pdf",
    "raw-markdown",
    "app-txt-file",
    "app-audio-file",
    "app-file",
    "app-file",
  ]);
  // The extension rides on the tile so the skin can whiten the office page body.
  assert.deepEqual(tiles.map((n) => n.dataset.ext), ["docx", "xlsx", "pptx", "pdf", "md", "txt", "mp3", "zip", ""]);
});

// The thread rows sit in their own list box (scrolls under a fixed label).
test("thread rows live in a scrollable list under the File Threads label", () => {
  const t = S.chatDetailsOverview(ui, data);
  const list = walk(t).find((n) => n.className === "window__chat-details-thread-list");
  assert.ok(list, "missing thread-list");
  assert.deepEqual(list.kids.map((k) => k.file_nid), ["f1", "f2"]);
});

// "Meeting" tile = the Meet schedule's start button (window-folder__meeting-
// sched-start-btn): same launch, same three states, same permission rule —
// starting is an edit-tier action, joining a live one is not.
const meetUi = (flags = {}) => ({
  fig: { group: "window", family: "window-folder" },
  mget: (k) => ({ hub_id: "h1" })[k],
  canUpload: () => flags.canUpload !== false,
  _meetingJoined: flags.joined ? 1 : 0,
  _meetingActive: flags.active ? 1 : 0,
  _meetingWindowLive: () => !!flags.live,
});
const meetingTile = (u) => walk(S.chatDetailsOverview(u, data)).find((n) => n.service === "chat-details-meeting");

test("meeting tile: idle → Meeting, live in room → Join meeting, in it → Joined (locked)", () => {
  assert.deepEqual(S.meetingTileState(meetUi()), { label: en.MEETING, joined: false, hidden: false });
  assert.deepEqual(S.meetingTileState(meetUi({ active: true })), { label: en.JOIN_MEETING, joined: false, hidden: false });
  assert.deepEqual(S.meetingTileState(meetUi({ joined: true })), { label: en.JOINED, joined: true, hidden: false });
  assert.deepEqual(S.meetingTileState(meetUi({ live: true })), { label: en.JOINED, joined: true, hidden: false });
  const t = meetingTile(meetUi({ joined: true }));
  assert.match(t.className, /window__chat-details-action--meeting/);
  assert.equal(t.dataset.joined, 1);
  assert.ok(walk(t).some((n) => n.content === en.JOINED));
});

test("meeting tile: a viewer who cannot start gets no tile, unless there is one to join", () => {
  assert.equal(S.meetingTileState(meetUi({ canUpload: false })).hidden, true);
  assert.equal(meetingTile(meetUi({ canUpload: false })), undefined);
  assert.equal(S.meetingTileState(meetUi({ canUpload: false, active: true })).hidden, false);
  assert.ok(meetingTile(meetUi({ canUpload: false, active: true })));
});

// Videos: every tile carries the play badge so it never reads as a photo; the
// duration text rides along only when known (server fills it from info.json).
test("video tiles always show the play badge; duration only when known", () => {
  const t = S.chatDetailsPage(ui, "video", [
    { nid: "v1", category: "video", duration: 540, ctime: dayjs().unix() },
    { nid: "v2", category: "video", duration: null, ctime: dayjs().unix() },
  ]);
  const tiles = walk(t).filter((n) => n.service === "chat-details-open-media");
  const badge = (tile) => walk(tile).find((n) => /chat-details-duration(\s|$)/.test(n.className || ""));
  assert.ok(badge(tiles[0]) && badge(tiles[1]));
  assert.ok(walk(badge(tiles[0])).some((n) => n.content === "9:00"));
  assert.ok(walk(badge(tiles[1])).some((n) => n.ico === "ph-play-fill"));
  assert.equal(walk(badge(tiles[1])).filter((n) => n.type === "Note").length, 0);
  // photos stay badge-free
  const p = S.chatDetailsPage(ui, "photo", [{ nid: "i1", category: "image" }]);
  assert.equal(walk(p).filter((n) => /chat-details-duration(\s|$)/.test(n.className || "")).length, 0);
});

// Photos / Videos: the file name under each thumbnail. The tile stays the
// clickable item; the picture lives in its -thumb box, the name below it.
test("photo and video tiles show the file name under the thumbnail", () => {
  for (const page of ["photo", "video"]) {
    const t = S.chatDetailsPage(ui, page, [
      { nid: "m1", category: page === "photo" ? "image" : "video", filename: "Holiday beach.jpg", ctime: dayjs().unix() },
    ]);
    const tile = walk(t).find((n) => n.service === "chat-details-open-media");
    const [thumb, name] = tile.kids;
    assert.equal(thumb.className, "window__chat-details-thumb", page);
    assert.ok(walk(thumb).some((n) => n.type === "Image.Smart"), page);
    assert.equal(name.className, "window__chat-details-tile-name", page);
    assert.equal(name.content, "Holiday beach.jpg", page);
    assert.equal(name.attrOpt.title, "Holiday beach.jpg", page); // full name on hover
  }
});

// ── Loading skeletons ────────────────────────────────────────────────────
const sk = (tree) => walk(tree).filter((n) => /(^|\s)window__chat-details-sk(\s|$)/.test(n.className || ""));
const hasClass = (n, c) => (n.className || "").split(/\s+/).includes(`window__chat-details-${c}`);

test("overview while loading: real header + actions, placeholder threads / counts / members", () => {
  const t = S.chatDetailsOverview(ui, { loading: true });
  assert.equal(byService(t, "close-chat-details").length, 1);
  assert.deepEqual(
    ["chat-details-mute", "chat-details-meeting", "chat-details-download"].map((s) => byService(t, s).length),
    [1, 1, 1],
  );
  // nothing that pretends to be data
  assert.equal(byService(t, "chat-details-page").length, 0);
  assert.equal(byService(t, "chat-details-thread").length, 0);
  assert.ok(!texts(t).some((x) => /photos|members/.test(`${x}`)));
  const box = walk(t).find((n) => hasClass(n, "skeleton"));
  assert.ok(box, "missing overview skeleton");
  assert.equal(walk(box).filter((n) => hasClass(n, "sk--count")).length, 4);
  assert.ok(walk(box).filter((n) => hasClass(n, "sk--member")).length >= 4);
  assert.ok(walk(box).filter((n) => hasClass(n, "sk--thread")).length >= 2);
});

test("each page while loading draws its own placeholder layout", () => {
  const load = (page) => S.chatDetailsPage(ui, page, [], { loading: true });
  for (const page of ["photo", "video", "file", "link"]) {
    const t = load(page);
    assert.equal(byService(t, "chat-details-back").length, 1, page);
    assert.equal(byService(t, "chat-details-open-media").length + byService(t, "chat-details-open-link").length, 0, page);
    const body = walk(t).find((n) => hasClass(n, "skeleton"));
    assert.ok(body, `no skeleton for ${page}`);
    assert.equal(body.dataset.page, page);
  }
  assert.ok(walk(load("photo")).filter((n) => hasClass(n, "sk--tile")).length >= 14);
  assert.ok(walk(load("video")).filter((n) => hasClass(n, "sk--tile")).length >= 7);
  assert.ok(walk(load("video")).some((n) => hasClass(n, "sk--month")));
  assert.ok(walk(load("file")).filter((n) => hasClass(n, "sk--file")).length >= 5);
  assert.ok(walk(load("link")).filter((n) => hasClass(n, "sk--link")).length >= 4);
});

// Chat tab "# General" header: gets the ⋮ (Chat details) on a workspace
// window; a share-token window keeps its old search-only header there.
test("# General header carries the ⋮ only where it opens Chat details", () => {
  assert.equal(S.generalHeaderMenu(win({})), true);
  assert.equal(S.generalHeaderMenu(win({ token: "tk" })), false);
  assert.equal(S.generalHeaderMenu(win({}, "window-sharebox")), false);
});
