// file-switcher-scope-groups.test.js — the Open-File Switcher's "Other files"
// keeps listing the folder the viewer was opened from, split into type
// groups, and the collapsed column shows the toggle rather than the title.
//
//   node --test tests/file-switcher-scope-groups.test.js
//
// QA (2026-10-19): switching to a recently viewed file that lives elsewhere
// swapped "Other files" for that folder's files (or nothing); the list mixed
// pictures, videos, docx, py, csv and mp3; collapsed, the column read "Files".
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const { sliceFunction } = require("./helpers/slice-method");

const root = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

// groups.js reaches file-group through the webpack alias.
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (req, ...rest) {
  if (req === "window/skeleton/toolkit/file-group") {
    return path.join(root, "src/drumee/builtins/window/skeleton/toolkit/file-group.js");
  }
  return origResolve.call(this, req, ...rest);
};
const { groupFiles, sectionOf, ORDER, LABEL } = require("../src/drumee/builtins/player/widget/file-switcher/groups");

const INDEX_SRC = read("src/drumee/builtins/player/widget/file-switcher/index.js");
const RECENT_SRC = read("src/drumee/builtins/player/widget/file-switcher/recent.js");
const SKIN_SRC = read("src/drumee/builtins/player/widget/file-switcher/skin/index.scss");
const SKEL_SRC = read("src/drumee/builtins/player/widget/file-switcher/skeleton/index.js");

const f = (filename, ext, filetype, extra = {}) => ({ nid: `${filename}.${ext}`, filename, ext, filetype, ...extra });

test("files fall into the folder's own Group view sections", () => {
  assert.equal(sectionOf(f("a", "docx", "document")), "doc");
  assert.equal(sectionOf(f("a", "txt", "text")), "doc");
  assert.equal(sectionOf(f("a", "xlsx", "document")), "sheet");
  assert.equal(sectionOf(f("a", "csv", "text")), "sheet");
  // A Univer sheet saved as .json, its marker in the stored metadata text.
  assert.equal(
    sectionOf(f("Sheet 09-09", "json", "app-data", { metadata: JSON.stringify({ dataType: "sheet.univer" }) })),
    "sheet",
  );
  assert.equal(sectionOf(f("a", "pptx", "document")), "slide");
  assert.equal(sectionOf(f("a", "pdf", "document")), "pdf");
  assert.equal(sectionOf(f("a", "png", "image")), "media");
  assert.equal(sectionOf(f("a", "mov", "video")), "media");
  assert.equal(sectionOf(f("a", "mp3", "audio")), "media");
  assert.equal(sectionOf(f("a", "md", "markdown")), "markdown");
  assert.equal(sectionOf(f("a", "json", "app-data", { metadata: "not json" })), "json");
  assert.equal(sectionOf(f("a", "html", "web")), "html");
  assert.equal(sectionOf(f("a", "py", "script")), "other");
  // Never a Folders section: folders have windows of their own.
  assert.equal(sectionOf(f("sub", "", "folder")), "other");
});

test("groupFiles keeps the Group view order and labels, and drops empty sections", () => {
  const { GROUP_ORDER, GROUP_LABEL } = require("../src/drumee/builtins/window/skeleton/toolkit/file-group");
  assert.deepEqual(ORDER, GROUP_ORDER.filter((k) => k !== "folder"));
  const groups = groupFiles([
    f("clip", "mp3", "audio"), f("shot", "png", "image"), f("plan", "xlsx", "document"),
    f("notes", "docx", "document"), f("rec", "mov", "video"), f("tool", "py", "script"),
    f("second", "docx", "document"), f("deck", "pptx", "document"), f("paper", "pdf", "document"),
    f("readme", "md", "markdown"), f("conf", "json", "app-data"), f("page", "html", "web"),
  ]);
  assert.deepEqual(groups.map((g) => g.key), ORDER);
  assert.deepEqual(groups.map((g) => g.label), ORDER.map((k) => GROUP_LABEL[k]));
  assert.deepEqual(groups.map((g) => g.label).slice(0, 5), ["GROUP_DOCUMENTATION", "SPREADSHEET", "PRESENTATION", "GROUP_PDF", "MEDIA"]);
  assert.deepEqual(groups[0].items.map((n) => n.filename), ["notes", "second"], "order within a section is kept");
  assert.deepEqual(groups[4].items.map((n) => n.filename), ["clip", "shot", "rec"], "pictures, videos and sound share Media, as on the folder");
  assert.deepEqual(groupFiles([f("a", "docx", "document")]).map((g) => g.key), ["doc"]);
  assert.deepEqual(groupFiles([]), []);
});

test("every section label exists in every locale", () => {
  for (const l of ["en", "fr", "es", "ru", "zh", "km"]) {
    const d = JSON.parse(read(`locale/${l}.json`));
    for (const k of ORDER) assert.ok(d[LABEL[k]], `${l} ${LABEL[k]}`);
    assert.equal(d.SPREADSHEETS, undefined, `${l}: no key of the panel's own`);
  }
});

// ── the listed folder survives a switch ─────────────────────────────────────
const takeHandoffSrc = INDEX_SRC.match(/function takeHandoff\(\) \{[\s\S]*?\n\}/)[0];
assert.match(INDEX_SRC, /const HANDOFF_TTL_MS = 30000;/);

function switcher(node, handed) {
  const calls = [];
  const sw = {
    el: { dataset: {} },
    calls,
    _recent: [],
    _folder: [],
    node: () => node,
    feed() {},
    renderLists() { calls.push("render"); },
    loadOthers() { calls.push("load"); },
    ensurePart: () => ({ then: (cb) => cb({ el: {} }) }),
    isDestroyed: () => false,
    fetchService: async (o) => {
      calls.push(["fetch", o.nid, o.hub_id]);
      return [
        { nid: "x", filetype: "document", filename: "x", ext: "docx" },
        { nid: "f", filetype: "folder", filename: "sub" },           // its own window
        { nid: "m", filetype: "schedule", filename: "standup" },     // a meeting, on the Meet tab
        { nid: "h", filetype: "text", filename: ".env", ext: "" },   // hidden until "show hidden files"
      ];
    },
  };
  const onDomRefresh = new Function(
    "readCollapsed", "skeleton", "recent", "takeHandoff",
    `return ${sliceFunction(INDEX_SRC, "onDomRefresh()")}`,
  )(() => false, () => [], { remember() {}, read: () => [] }, () => handed);
  const loadOthers = new Function(
    "SERVICE", "_a", "_K", "CONTAINER_FILETYPES", "fileListSkip", "isScheduleNode",
    `return ${sliceFunction(INDEX_SRC, "async loadOthers()")}`,
  )({ media: { show_node_by: "media.show_node_by" } }, { mtime: "mtime" }, { order: { descending: "desc" } }, ["folder", "hub"],
    () => ({ filename: /^\./ }), (f) => f.filetype === "schedule");
  sw.onDomRefresh = onDomRefresh;
  sw.loadOthers = loadOthers;
  return sw;
}

test("a first panel lists the open file's folder; the next one keeps the folder it was handed", async () => {
  const first = switcher({ nid: "a", pid: "FOLDER_X", hub_id: "HUB_X" }, null);
  first.onDomRefresh();
  assert.deepEqual(first._scope, { pid: "FOLDER_X", hub_id: "HUB_X" });
  // A recently viewed file from another workspace: "Other files" stays on X.
  const handed = { at: Date.now(), scope: { pid: "FOLDER_X", hub_id: "HUB_X" }, folder: [{ nid: "k" }], scrollTop: 0 };
  const next = switcher({ nid: "b", pid: "FOLDER_Y", hub_id: "HUB_Y" }, handed);
  next.onDomRefresh();
  assert.deepEqual(next._scope, { pid: "FOLDER_X", hub_id: "HUB_X" });
  assert.deepEqual(next._folder, [{ nid: "k" }], "drawn from the handed list before the fetch");
  await next.loadOthers();
  const fetched = next.calls.find((c) => c[0] === "fetch");
  assert.deepEqual(fetched, ["fetch", "FOLDER_X", "HUB_X"], "re-read from the listed folder, not the file's");
  assert.deepEqual(next._folder.map((f) => f.nid), ["x"], "folders, meetings and dotfiles stay out, as in the folder's own listing");
  assert.equal(next._folder[0].hub_id, "HUB_X");
});

test("a handoff is taken once, and only while fresh", () => {
  const take = (h, now) => new Function("handoff", "HANDOFF_TTL_MS", "Date",
    `${takeHandoffSrc}; return takeHandoff();`)(h, 30000, { now: () => now });
  const h = { at: 1000, scope: {} };
  assert.equal(take(h, 1000 + 29000), h);
  assert.equal(take(h, 1000 + 31000), null, "left behind by a switch into a panel-less player");
  assert.equal(take(null, 5000), null);
});

test("the next file is created in the listed folder, and the handoff carries it", () => {
  assert.match(INDEX_SRC, /const \{ pid, hub_id \} = this\._scope \|\| this\.node\(\);/);
  assert.match(INDEX_SRC, /handoff = \{\s*at: Date\.now\(\),\s*scope: this\._scope,\s*folder: this\._folder,/);
  // Grouped once loaded; the loading skeleton (#740) stands in before that.
  assert.match(INDEX_SRC, /loading\s*\?\s*skeleton\.loadingRows\(this\)\s*:\s*skeleton\.groupedRows\(this, groupFiles\(others\), "other", empty\)/);
  assert.match(SKEL_SRC, /function groupedRows\(ui, groups, section, empty, currentNid\)/);
});

test("collapsed, the toggle stays and the title goes", () => {
  const collapsed = SKIN_SRC.slice(SKIN_SRC.indexOf('&__ui[data-collapsed="1"] {'));
  const hidden = collapsed.match(/\.file-switcher__title,[\s\S]*?\{\s*display: none;/)[0];
  assert.match(hidden, /\.file-switcher__group,/);
  assert.doesNotMatch(hidden, /__toggle/);
});

// ── an .html row opens a new tab, as the folder does ────────────────────────
test("a web row opens in a new tab inside the click; a gone page closes it and says so", async () => {
  assert.match(SKEL_SRC, /filetype: node\.filetype,/);
  assert.match(INDEX_SRC, /if \(filetype === _a\.web\) return this\.openInTab\(nid, hub_id\);/);
  assert.match(INDEX_SRC, /this\.switchTo\(cmd\.mget\(_a\.nid\), cmd\.mget\(_a\.hub_id\), cmd\.mget\(_a\.filetype\)\)/);
  const opened = [];
  const alerts = [];
  const tab = { closed: 0, location: {}, close() { this.closed++; } };
  global.window = { open: (u) => { opened.push(u); return tab; } };
  global.Kind = { waitFor: async () => function (o) { this.srcUrl = () => `https://h/${o.model.nid}`; } };
  global.Backbone = { Model: function (n) { Object.assign(this, n); } };
  global.Wm = { alert: (m) => alerts.push(m) };
  global.SERVICE = { media: { attributes: "media.attributes" } };
  global._a = { ...(global._a || {}), media: "media", web: "web" };
  global.LOCALE = { ...(global.LOCALE || {}), FILE_NOT_FOUND: "gone" };
  const forgot = [];
  const openInTab = new Function("recent", `return ${sliceFunction(INDEX_SRC, "async openInTab(nid, hub_id)")}`)({ forget: (n) => forgot.push(n) });
  const me = (node) => ({
    _recent: [{ nid: "p" }, { nid: "q" }], rendered: 0,
    fetchService: async () => node, isDestroyed: () => false, warn() {},
    renderLists() { this.rendered++; },
  });
  await openInTab.call(me({ nid: "p" }), "p", "H");
  assert.deepEqual(opened, [""], "the tab is opened before any await");
  assert.equal(tab.location.href, "https://h/p");
  assert.equal(tab.closed, 0);
  const m = me(null);
  await openInTab.call(m, "q", "H");
  assert.equal(tab.closed, 1);
  assert.deepEqual(alerts, ["gone"]);
  assert.deepEqual(forgot, ["q"]);
  assert.deepEqual(m._recent, [{ nid: "p" }]);
  assert.equal(m.rendered, 1);
});

// ── Recently viewed is the listed folder's too ─────────────────────────────
test("Recently viewed shows the listed folder's files only, the open file always", () => {
  assert.match(RECENT_SRC, /const MAX = 30;/);
  assert.match(RECENT_SRC, /write\(\[\{ nid, hub_id, pid, filename, ext, filetype, area \}, \.\.\.rest\]\);/);
  const inScope = new Function(`return ${sliceFunction(INDEX_SRC, "inScope(n)")}`)();
  const renderLists = new Function("MAX_RECENT", "LOCALE", "skeleton", "groupFiles",
    `return ${sliceFunction(INDEX_SRC, "renderLists()")}`,
  )(5, { NO_FILE_RESULTS: "none", NO_FILES_YET: "none" }, { rows: (ui, l) => l, groupedRows: (ui, g) => g }, (l) => l);
  const fed = {};
  const sw = {
    _scope: { pid: "X", hub_id: "H" },
    _query: "",
    _folder: [{ nid: "old-in-x", hub_id: "H" }, { nid: "cur" }, { nid: "k" }],
    _recent: [
      { nid: "cur", hub_id: "H", pid: "X" },           // the open file
      { nid: "y1", hub_id: "H", pid: "Y" },            // another folder
      { nid: "w1", hub_id: "H2", pid: "X" },           // another workspace
      { nid: "old-in-x", hub_id: "H" },                // kept before pid was: in the listing
      { nid: "old-elsewhere", hub_id: "H" },           // kept before pid was: not in it
      { nid: "x2", hub_id: "H", pid: "X" },
    ],
    node: () => ({ nid: "cur" }),
    match: () => true,
    inScope,
    ensurePart: (pn) => ({ then: (cb) => cb({ feed: (k) => { fed[pn] = k; } }) }),
  };
  renderLists.call(sw);
  assert.deepEqual(fed["recent-list"].map((n) => n.nid), ["cur", "old-in-x", "x2"]);
  assert.deepEqual(fed["other-list"].map((n) => n.nid), ["old-in-x", "k"], "the open file alone is left out; a recent row shows in both lists");
});

// ── every viewer opened from a folder carries the panel ─────────────────────
test("every viewer skeleton is wrapped in the Open-File Switcher frame", () => {
  const skeletons = [
    "src/drumee/builtins/player/document/skeleton/index.js",
    "src/drumee/builtins/player/image/skeleton/index.js",
    "src/drumee/builtins/player/video/skeleton/index.js",
    "src/drumee/builtins/player/audio/skeleton/index.js",
    "src/drumee/builtins/player/text/skeleton/index.js",
    "src/drumee/builtins/player/vector/skeleton/index.js",
    "src/drumee/builtins/editor/markdow/skeleton/index.js",
    "src/drumee/builtins/editor/note/skeleton/index.js",
    "src/drumee/builtins/editor/diagram/skeleton/index.js",
    "src/drumee/builtins/editor/sheet/skeleton/index.js",
    "src/drumee/builtins/editor/docs/skeleton/index.js",
  ];
  for (const p of skeletons) {
    const src = read(p);
    assert.match(src, /file-switcher\/frame"\)/, p);
    assert.match(src, /withFileSwitcher\((ui|_ui_), /, p);
  }
  // Audio keeps its compact box only where the frame is off (share page).
  const interact = read("src/drumee/builtins/player/interact.js");
  assert.match(interact, /if \(this\.mget\(_a\.kind\) === "audio_player"\) \{\s*return require\("builtins\/player\/widget\/file-switcher\/frame"\)\.enabled\(this\);/);
  const frame = read("src/drumee/builtins/player/widget/file-switcher/frame.js");
  assert.match(frame, /module\.exports\.enabled = enabled;/);
  assert.match(read("src/drumee/builtins/player/audio/skin/index.scss"), /&:has\(\.file-switcher__frame\) \{\s*max-height: none;/);
  // A .schedule node is a meeting, not a file: the Meet tab shows it.
  assert.match(INDEX_SRC, /&& !isScheduleNode\(f\) && !\(hidden && hidden\.test\(String\(f\.filename \|\| ""\)\)\)/);
  assert.match(INDEX_SRC, /const hidden = fileListSkip\(\)\.filename;/);
});

// ── a type the application map does not name still opens from the panel ──────
test("openMedia tells a Univer .json sheet apart through a media model", async () => {
  const OPEN_SRC = read("src/drumee/libs/open-media.js");
  const launches = [];
  const openMedia = new Function(
    "appConfig", "launchPlayer", "SERVICE", "LOCALE", "Wm", "Kind", "Backbone", "_a",
    `return ${OPEN_SRC.match(/async function openMedia\([\s\S]*?\n\}/)[0]}`,
  )(
    // application(): names "document" directly; "app-data" only once it can read the media's dataType.
    (filetype, opt) => {
      if (filetype === "document") return { kind: "document_reader" };
      if (opt.media && opt.media.model.dataType === "sheet.univer") return { kind: "editor_sheet", media: opt.media };
      return {};
    },
    async (args) => { launches.push(args); return true; },
    { media: { attributes: "media.attributes" } },
    { FILE_NOT_FOUND: "gone" },
    { alert() {} },
    { waitFor: async () => function (o) { this.model = o.model; } },
    { Model: function (n) { Object.assign(this, n); } },
    { media: "media" },
  );
  const node = { nid: "s1", filetype: "app-data", dataType: "sheet.univer", mimetype: "application/json" };
  const fetchService = async () => node;
  assert.equal(await openMedia({ nid: "s1", hub_id: "H", filetype: "app-data" }, { fetchService }), true);
  assert.equal(launches[0].opt.kind, "editor_sheet");
  assert.ok(launches[0].media, "the media built for the lookup is handed to the player");
  // A directly named type does not fetch or build anything extra.
  await openMedia({ nid: "d1", hub_id: "H", filetype: "document" }, { fetchService });
  assert.equal(launches[1].opt.kind, "document_reader");
  assert.equal(launches[1].media, null);
  // Still nothing for a type nobody can open.
  assert.equal(await openMedia({ nid: "x", hub_id: "H", filetype: "app-data" }, { fetchService: async () => ({ nid: "x", filetype: "app-data" }) }), null);
});
