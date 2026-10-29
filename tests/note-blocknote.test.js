// The Notion-style Note (BlockNote), shipped alongside the existing Note.
//
// Three things here are worth a test and nothing else really is.
//
// 1. THE FILE FORMAT, because it is the data-loss guard. A note we cannot read
//    must report an ERROR, never an empty document: the editor refuses to save
//    when the read failed, and the whole guarantee that we never overwrite a
//    file we failed to understand rests on parse() telling the truth. Office
//    and note files in Drumee keep no version history, so that overwrite would
//    be unrecoverable.
//
// 2. THE ROUTING, because it is the one edit this feature makes to a file every
//    other viewer in the app goes through. The table below is the REGRESSION
//    half: it pins what each existing filetype/mimetype has always resolved to,
//    so a future change to the `.dnote` branch that disturbs any of them fails
//    here instead of in someone's folder.
//
// 3. THE MENU SURFACES, because there must now be exactly ONE Note on each of
//    them and that is invisible in a diff. The trial ran beside the markdown
//    Note; since 2026-09-18 it REPLACES it (Lexis, via Duy), so a leftover
//    second row would be two ways to make the same file.
//
// 4. THE MIGRATION, because it is the second data-loss guard. Old notes are
//    markdown, and BlockNote's markdown conversion is lossy in BOTH directions
//    by its own documentation. Reading one is fine; writing one back is not,
//    so the export side must never appear in this editor at all.
const test = require("node:test");
const assert = require("node:assert");
const Module = require("node:module");
const { existsSync, readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { requireEsmish } = require("./helpers/load-esmish.js");

const ROOT = resolve(__dirname, "..");

// The app injects these; node does not. Only the handful the modules under
// test actually read.
function installGlobals() {
  const saved = {};
  const set = (k, v) => { saved[k] = global[k]; global[k] = v; };
  set("_a", { ext: "ext", extension: "extension", filename: "filename", content: "content" });
  // Locale keys resolve to their own name, so an assertion names the KEY —
  // which is what must not silently change — rather than English copy.
  set("LOCALE", new Proxy({}, { get: (_t, k) => String(k) }));
  const node = (kind) => (props = {}) => ({ __kind: kind, ...props });
  const boxNode = (flow) => (props = {}) => ({ __kind: "box", __flow: flow, ...props });
  set("Skeletons", {
    Box: Object.assign(boxNode("y"), { X: boxNode("x"), Y: boxNode("y"), Z: boxNode("y"), G: boxNode("y") }),
    Note: node("note"), Entry: node("entry"), Element: node("element"),
    Button: { Svg: node("button.svg"), Label: node("button.label") },
    Image: { Svg: node("image.svg") },
    Wrapper: Object.assign(node("wrapper"), { Y: node("wrapper"), X: node("wrapper") }),
  });
  return () => Object.entries(saved).forEach(([k, v]) => { global[k] = v; });
}

// `libs/...` is a webpack alias; map it to the real directory so the routing
// module loads the SAME format module the app does, not a copy.
//
// Installed for the whole file rather than around the require, because
// application.js resolves the alias at CALL time — the require sits inside the
// function, the way the rest of that file requires libs/over-limit. Wrapping
// only the import left it unresolved at the moment it is actually needed.
const _resolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (request.startsWith("libs/")) request = resolve(ROOT, "src/drumee", request);
  return _resolveFilename.call(this, request, ...rest);
};

const fmt = require("../src/drumee/libs/blocknote-format.js");

// ── 1. the file format ──────────────────────────────────────────────────────

test("a note round-trips through serialize/parse", () => {
  const blocks = [
    { type: "heading", props: { level: 1 }, content: "Title" },
    { type: "checkListItem", content: "done" },
  ];
  const out = fmt.parse(fmt.serialize(blocks));
  assert.equal(out.error, undefined);
  assert.deepEqual(out.blocks, blocks);
});

test("an empty note is empty, not an error", () => {
  // A brand-new note legitimately has no bytes yet; that must not trip the
  // read-only guard.
  for (const empty of ["", "   ", undefined, null]) {
    const out = fmt.parse(empty);
    assert.equal(out.error, undefined, `${JSON.stringify(empty)} should be readable`);
    assert.deepEqual(out.blocks, []);
  }
});

test("unreadable content reports an ERROR and never an empty document", () => {
  // This is the data-loss guard. If any of these came back as `{blocks: []}`
  // the editor would mount empty, autosave would fire, and a file we failed to
  // understand would be replaced with a blank one — unrecoverable.
  const cases = {
    "not json at all {{{": "unparsable",
    "null": "unrecognised",
    '{"blocks":[]}': "unrecognised",                       // no app marker
    '{"app":"something.else","blocks":[]}': "unrecognised", // another app's file
    '{"app":"drumee.blocknote"}': "unrecognised",           // marker but no blocks
    '{"app":"drumee.blocknote","blocks":"nope"}': "unrecognised",
  };
  for (const [raw, why] of Object.entries(cases)) {
    const out = fmt.parse(raw);
    assert.equal(out.error, why, `${raw} must be rejected as ${why}`);
    assert.equal(out.blocks, undefined, `${raw} must not yield blocks`);
  }
});

test("the envelope is versioned, so a format change is detectable", () => {
  const data = JSON.parse(fmt.serialize([]));
  assert.equal(data.app, "drumee.blocknote");
  assert.equal(typeof data.version, "number");
  assert.equal(fmt.EXT, "dnote");
});

// ── 2. routing ──────────────────────────────────────────────────────────────

const app = require("../src/drumee/builtins/window/configs/application.js");

const media = (mimetype, dataType, ext, imgCapable = false) => ({
  model: { toJSON: () => ({ mimetype, dataType }) },
  imgCapable: () => imgCapable,
  mget: (k) => (k === "ext" ? ext : undefined),
});

test(".dnote reaches the BlockNote editor by every route a file is opened through", () => {
  const restore = installGlobals();
  try {
    // A tile click carries the media widget…
    assert.equal(app("note", { media: media("text/*", null, "dnote") }).kind, "editor_blocknote");
    // …an image-capable node still lands here (imgCapable short-circuits early)…
    assert.equal(app("note", { media: media("text/*", null, "dnote", true) }).kind, "editor_blocknote");
    // …a deep link carries plain node fields and no widget at all…
    assert.equal(app("note", { ext: "dnote" }).kind, "editor_blocknote");
    assert.equal(app("note", { extension: "dnote" }).kind, "editor_blocknote");
    // …and the extension is matched case-insensitively.
    assert.equal(app("note", { ext: "DNOTE" }).kind, "editor_blocknote");
  } finally { restore(); }
});

test("every other file type still opens where it always did", () => {
  const restore = installGlobals();
  try {
    // filetype, mimetype, dataType, ext -> expected kind. Pinned deliberately:
    // the `.dnote` branch runs BEFORE all of this, so a mistake there would
    // steal one of these.
    const table = [
      ["note",     "text/html",        "drumee.note",   "html", "editor_note"],
      // The markdown Note is REPLACED, not run beside (Lexis, via Duy,
      // 2026-09-18). editor_markdown keeps the other text formats it owns.
      ["markdown", "text/markdown",    null,            "md",   "editor_blocknote"],
      ["app-data", "application/json", "diagram.state", "json", "editor_diagram"],
      ["text",     "text/plain",       null,            "txt",  "text_viewer"],
      ["folder",   null,               null,            "",     "window_folder"],
      ["contact",  null,               null,            "",     "window_contact"],
      ["image",    "image/png",        null,            "png",  "image_viewer"],
      ["video",    "video/mp4",        null,            "mp4",  "video_viewer"],
      ["audio",    "audio/mpeg",       null,            "mp3",  "audio_player"],
      ["document", "application/pdf",  null,            "pdf",  "document_reader"],
    ];
    for (const [ft, mt, dt, ext, expected] of table) {
      const got = app(ft, { media: media(mt, dt, ext) }).kind;
      assert.equal(got, expected, `${ft}/${mt} should open ${expected}, got ${got}`);
    }
  } finally { restore(); }
});

test("a file with no extension is untouched by the new branch", () => {
  const restore = installGlobals();
  try {
    // The guard reads `${undefined || ...}` — it must not stringify into "undefined"
    // and match something.
    assert.notEqual(app("note", { media: media("text/html", "drumee.note", undefined) }).kind,
      "editor_blocknote");
    assert.equal(app("note", {}).kind, "editor_note");
  } finally { restore(); }
});

// ── 3. the menu surfaces ────────────────────────────────────────────────────

test("the desk + New menu offers exactly ONE Note", () => {
  const restore = installGlobals();
  try {
    const { createEntries } = require("../src/drumee/modules/desk/skeleton/create-items.js");
    const services = createEntries(true).map((e) => e.service);
    // The trial used to sit next to the old Note. Now there is one row, and
    // `new-note` is the name it keeps — a second row would just be two ways to
    // make the same file.
    assert.ok(services.includes("new-note"), "the Note row is missing");
    assert.ok(
      !services.includes("new-blocknote"),
      "the trial row must be gone: it now duplicates the Note row"
    );
    assert.equal(
      services.filter((x) => x === "new-note").length, 1,
      "there must be exactly one Note row"
    );

    // A member with no write bit still gets none: it creates a file.
    const readOnly = createEntries(false).map((e) => e.service);
    assert.ok(!readOnly.includes("new-note"));
    assert.ok(!readOnly.includes("new-blocknote"));
  } finally { restore(); }
});

test("new-note opens the Notion-style editor on every surface that dispatches it", () => {
  // Reading the shipped source: instantiating Desk or window/core here would
  // drag in most of the runtime, and what matters is which kind each handler
  // launches — the same approach the context-menu test below takes.
  const desk = readFileSync(resolve(ROOT, "src/drumee/modules/desk/index.js"), "utf8");
  const deskCase = desk.slice(desk.indexOf('case "new-note":'));
  const deskKind = /kind:\s*"(editor_\w+)"/.exec(deskCase);
  assert.ok(deskKind, "the new-note handler no longer launches a kind");
  assert.equal(deskKind[1], "editor_blocknote");

  const core = readFileSync(resolve(ROOT, "src/drumee/builtins/window/core.js"), "utf8");
  const coreCase = core.slice(core.indexOf('case "add-note":'));
  const coreKind = /kind:\s*"(editor_\w+)"/.exec(coreCase);
  assert.ok(coreKind, "the add-note handler no longer launches a kind");
  assert.equal(coreKind[1], "editor_blocknote");
});

test("the workspace + New menu offers the trial, and Document/Sheet/Slides survive", () => {
  const restore = installGlobals();
  try {
    const { createRows } = requireEsmish("src/drumee/builtins/window/skeleton/toolkit/new-menu-rows.js");
    const ui = { fig: { group: "window" }, mget: () => "personal" };
    const services = createRows(ui).map((r) => r && r.service).filter(Boolean);
    assert.ok(services.includes("add-blocknote"), "the Note row is missing from the workspace menu");
    // The rows that were already there.
    assert.ok(services.includes("add-folder"));
    assert.equal(services.filter((s) => s === "new-document").length, 3);
    // NOTE the asymmetry, and that it is on purpose: the CURRENT Note row in
    // this menu was commented out as a product decision in 2026-08 and this
    // feature deliberately did not revive it.
    assert.ok(!services.includes("add-note"),
      "the current Note stays hidden here — reviving it is a separate decision");
  } finally { restore(); }
});

test("the desk context menu carries ONE Note", () => {
  // Rendering that submenu needs far more of the runtime than it is worth, so
  // the shipped SOURCE is read — the same approach tests/rail-logo-home.test.js
  // takes for the desk half it cannot instantiate.
  const src = readFileSync(
    resolve(ROOT, "src/drumee/builtins/contextmenu/skeleton/items.js"), "utf8");
  assert.match(src, /service:\s*'new-note'/, "the Note row must stay");
  assert.ok(
    !/service:\s*'new-blocknote'/.test(src),
    "the trial row must be gone: it now duplicates the Note row"
  );
  assert.ok(!/LOCALE\.NOTE_BETA/.test(src), "the beta label is retired");
});

test("both kinds are registered, and the existing editors are untouched", () => {
  const seeds = require("../src/drumee/seeds.js");
  for (const kind of ["editor_blocknote", "blocknote_state"]) {
    assert.equal(typeof seeds[kind], "function", `${kind} is not registered`);
  }
  for (const kind of ["editor_note", "editor_markdown", "editor_json"]) {
    assert.equal(typeof seeds[kind], "function", `${kind} must still be registered`);
  }
  // NOT asserted, because they are already broken and not by this feature:
  // `editor_diagram` and `schedule_viewer` are named by configs/application yet
  // registered by NO seed — the dead end window/manager.js `onDeadEnd` exists
  // to catch. Pinning them as "function" here would be asserting a bug away.
  for (const kind of ["editor_diagram", "schedule_viewer"]) {
    assert.equal(typeof seeds[kind], "undefined",
      `${kind} is unregistered today; if that changed, this note is stale`);
  }
});

test("every language carries the new keys", () => {
  // A missing key renders BLANK via createSafeObject — no error, just an empty
  // menu row, which is exactly the kind of thing nobody notices until QA.
  for (const lang of ["en", "es", "fr", "km", "ru", "zh"]) {
    const dict = JSON.parse(readFileSync(resolve(ROOT, `locale/${lang}.json`), "utf8"));
    for (const key of ["NOTE_BETA", "UNTITLED", "ALL_CHANGES_SAVED", "UNSAVED_CHANGES", "NOTE_UNREADABLE", "NOTE_UPGRADES_ON_SAVE", "NOTE_PRESS_SLASH", "NOTE_ADD_ICON", "NOTE_ADD_COVER", "NOTE_ADD_COMMENT", "NOTE_CHANGE_COVER", "NOTE_ADD_A_COMMENT", "NOTE_CLOSE_MENU", "NOTE_NEW_PAGE"]) {
      assert.ok(dict[key], `locale/${lang}.json is missing ${key}`);
    }
  }
});

// ---------------------------------------------------------------------------
// The migration off the markdown Note
// ---------------------------------------------------------------------------

test("a note in the OLD format is recognised from any one signal", () => {
  const { isLegacyNote } = require("../src/drumee/libs/blocknote-format.js");
  // A node reaches the resolver with whichever of the three the caller had.
  assert.ok(isLegacyNote({ ext: "md" }));
  assert.ok(isLegacyNote({ ext: "MD" }), "extensions arrive in any case");
  assert.ok(isLegacyNote({ filetype: "markdown" }));
  assert.ok(isLegacyNote({ mimetype: "text/markdown" }));

  // And nothing else is swept up with it.
  assert.ok(!isLegacyNote({}));
  assert.ok(!isLegacyNote({ ext: "dnote", filetype: "note", mimetype: "text/*" }));
  assert.ok(!isLegacyNote({ ext: "txt", filetype: "text", mimetype: "text/plain" }));
  assert.ok(!isLegacyNote({ ext: "html", filetype: "note", mimetype: "text/html" }),
    "the legacy rich-text note is NOT a markdown note");
  assert.ok(!isLegacyNote({ ext: "mdx" }), "a longer extension must not match");
  assert.ok(!isLegacyNote({ mimetype: "text/markdownish" }));
});

test("an old note opens in the new editor even with no mimetype to read", () => {
  const restore = installGlobals();
  try {
    // The resolver is reached with only a filetype when there is no media
    // model — the `a` table has to agree with the branch at the top.
    assert.equal(app("markdown", {}).kind, "editor_blocknote");
    assert.equal(app("markdown", { ext: "md" }).kind, "editor_blocknote");
  } finally { restore(); }
});

test("the new note format still wins over the legacy check", () => {
  const restore = installGlobals();
  try {
    // A converted note can still carry a stale mimetype on a cached model; the
    // extension is what this editor writes and it must decide.
    const got = app("note", { media: media("text/markdown", null, "dnote") }).kind;
    assert.equal(got, "editor_blocknote");
  } finally { restore(); }
});

test("NOTHING launches the old markdown editor any more", () => {
  // The menus were only half the surface. Three more places create a note by
  // naming the kind directly — a folder window, the desk dock, and the DMZ
  // share view — and none of them goes through the window resolver, so
  // changing the routing alone left them making .md files. Enumerated here
  // because that is exactly the kind of thing a grep finds and a diff hides.
  const launchers = [
    "src/drumee/builtins/window/folder/index.js",
    "src/drumee/modules/desk/wm/dock/index.js",
    "src/drumee/modules/dmz/wm/index.js",
    "src/drumee/modules/desk/index.js",
    "src/drumee/builtins/window/core.js",
    "src/drumee/builtins/window/configs/application.js",
  ];
  for (const f of launchers) {
    const src = readFileSync(resolve(ROOT, f), "utf8");
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    assert.ok(
      !/kind:\s*["']editor_markdown["']/.test(code),
      `${f} still opens the old markdown editor`
    );
  }
});

test("the old editor is hidden, NOT removed", () => {
  // Duy, 2026-09-18: "hide it, don't remove it yet". It stays registered so
  // backing the new Note out is a one-line routing change, not a revert — and
  // so nothing that still names the kind explodes.
  const seeds = readFileSync(resolve(ROOT, "src/drumee/seeds.js"), "utf8");
  assert.match(seeds, /editor_markdown:/, "the old editor must stay registered");
  assert.match(seeds, /editor_note:/, "the legacy rich-text note must stay registered");
  const dir = resolve(ROOT, "src/drumee/builtins/editor/markdow/index.js");
  assert.ok(readFileSync(dir, "utf8").length > 0, "its source must still be there");
});

// ---------------------------------------------------------------------------
// Lexis's Figma (File viewer page, the note frames), 2026-10-22
// ---------------------------------------------------------------------------

const NOTE_DIR = "src/drumee/builtins/editor/blocknote";
const readNote = (f) => readFileSync(resolve(ROOT, NOTE_DIR, f), "utf8");

test("the header is the shared player topbar, laid out to the Figma", () => {
  // One header for every file viewer: the note reuses the widget the document
  // player uses instead of hand-building a second one.
  const topbar = readNote("skeleton/topbar.js");
  assert.match(topbar, /require\("builtins\/player\/widget\/topbar"\)/);
  // Share pill, Download, gear, Expand, Close — and nothing from the old bar
  for (const service of ['"secure-share"', '"download-note"', '"note-fullscreen"', "_e.close"]) {
    assert.ok(topbar.includes(`service: ${service}`) || topbar.includes(`(${service},`),
      `the header lost ${service}`);
  }
  for (const gone of ["toggle-rail", "floppy", "ph-faders"]) {
    assert.ok(!topbar.includes(gone), `${gone} belongs to the old header`);
  }
  // Export moved into the gear menu: every format is still reachable
  for (const fmt of ["pdf", "docx", "html", "md", "csv", "print"]) {
    assert.match(topbar, new RegExp(`row\\("${fmt}"`), `the gear menu lost ${fmt}`);
  }
  // and every header service is answered
  const win = readNote("index.js");
  for (const c of ['"secure-share"', '"download-note"', '"note-fullscreen"', '"export-note"', "_e.close"]) {
    assert.ok(win.includes(`case ${c}:`), `index.js does not answer ${c}`);
  }
  assert.ok(!/case "toggle-rail"|case "insert-block"/.test(win), "the rail is gone");
  assert.ok(!existsSync(resolve(ROOT, NOTE_DIR, "skeleton/rail.js")), "rail.js is gone");
});

test("the note is lifted above the folder window it was opened from", () => {
  // The shared editor skin carries `.editor__ui[data-state="1"] { z-index }`.
  // Dropping its @use (2026-10-22, while rewriting this skin) opened the note
  // UNDER the docked workspace window — present in the DOM, invisible.
  const skin = readNote("skin/index.scss");
  assert.match(skin, /@use "\.\.\/\.\.\/skin\/topbar\.scss";/);
  const shared = readFileSync(resolve(ROOT, "src/drumee/builtins/editor/skin/topbar.scss"), "utf8");
  assert.match(shared, /&\[data-state="1"\] \{\s*z-index: 10000 !important;/);
});

test("labels in this editor carry the ONE tooltip rule", () => {
  // The shared skins style tooltips under prefixes this editor does not
  // carry; uncovered, a label renders static, in the page font, wrapping.
  // It shipped broken twice when hand-copied — so it is one mixin.
  const skin = readNote("skin/index.scss");
  assert.match(skin, /@mixin note-tooltip\(\$side: below\) \{/);
  const mixin = skin.slice(skin.indexOf("@mixin note-tooltip"));
  assert.match(mixin.slice(0, 1200), /position: absolute;/);
  assert.match(mixin.slice(0, 1200), /white-space: nowrap;/);
  assert.match(mixin.slice(0, 1200), /\$size: 12px/);
  const handRolled = (skin.match(/background-color: var\(--bg-tooltips\)/g) || []).length;
  assert.strictEqual(handRolled, 1, "the tooltip background belongs to the mixin alone");
  assert.ok((skin.match(/@include note-tooltip\(/g) || []).length >= 2);
});

test("the page decorations ride in the file, and only when set", () => {
  // A note with no icon and no cover must be byte-for-byte what it always
  // was — nothing to migrate, nothing for an older reader to trip on.
  const plain = JSON.parse(fmt.serialize([{ id: "a" }]));
  assert.deepStrictEqual(Object.keys(plain).sort(), ["app", "blocks", "version"]);
  assert.strictEqual(plain.version, 1, "additive keys are not a format change");

  const both = fmt.parse(fmt.serialize([], { icon: "🚀", cover: { nid: "n1", hub_id: "h1" } }));
  assert.strictEqual(both.icon, "🚀");
  assert.deepStrictEqual(both.cover, { nid: "n1", hub_id: "h1" });

  // a malformed decoration is dropped, never fatal: the text is what matters
  const odd = fmt.parse(JSON.stringify({ app: fmt.DATA_TYPE, version: 1, blocks: [], icon: 5, cover: "x" }));
  assert.ok(!odd.error);
  assert.strictEqual(odd.icon, "");
  assert.strictEqual(odd.cover, null);
  const bad = JSON.parse(fmt.serialize([], { icon: "x".repeat(40), cover: { nid: "" } }));
  assert.ok(!("icon" in bad) && !("cover" in bad), "junk is never written");
});

test("a decoration change is an edit, behind the same guard as any other", () => {
  // An unreadable note is never written back — an icon must not sneak a
  // write past that.
  const win = readNote("index.js");
  assert.match(win, /updatePage\(change\) \{\s*if \(this\._readOnly\) return;/);
  assert.match(win, /updatePage\(change\) \{[\s\S]{0,200}this\.markDirty\(\);/);
  const state = readNote("state.js");
  assert.match(state, /serialize\(this\._editor\.document, page\)/);
});

test("the / menu offers only blocks this editor really has", () => {
  // The Figma's menu is Notion's whole list. Rows BlockNote cannot back were
  // left out on purpose (Duy, 2026-10-22); every row that IS here must name a
  // real BlockNote item, or be one of ours with its own insert.
  const menu = readNote("slash-menu.js");
  const known = new Set([
    "paragraph", "heading", "heading_2", "heading_3", "heading_4", "bullet_list",
    "numbered_list", "check_list", "toggle_list", "quote", "code_block", "divider",
    "table", "image", "video", "audio", "file", "emoji",
    "toggle_heading", "toggle_heading_2", "toggle_heading_3",
  ]);
  const dict = JSON.parse(readFileSync(resolve(ROOT, "locale/en.json"), "utf8"));
  const rows = [...menu.matchAll(/\{\s*key: "([a-z_0-9]+)",\s*title: LOCALE\.([A-Z_0-9]+)([^}]*)/g)];
  assert.ok(rows.length >= 20, `expected the full menu, found ${rows.length}`);
  for (const [, key, loc, rest] of rows) {
    assert.ok(known.has(key) || /insert:/.test(rest) || /insert:/.test(menu.slice(menu.indexOf(`key: "${key}"`), menu.indexOf(`key: "${key}"`) + 400)),
      `${key} is neither a BlockNote item nor one of ours`);
    assert.ok(dict[loc], `locale/en.json is missing ${loc}`);
    const ico = /ico: "([a-z0-9-]+)"/.exec(rest);
    if (ico) {
      assert.ok(existsSync(resolve(ROOT, `icons/src/normalized/${ico[1]}.svg`)), `${ico[1]}.svg is missing`);
    }
  }
  const code = menu.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  for (const notHere of ["Table view", "Board view", "Synced block", "columns", "equation"]) {
    assert.ok(!code.includes(notHere), `${notHere} has no block behind it`);
  }
  // and BlockNote's own menu is switched off, or both would open on "/"
  assert.match(readNote("state.js"), /slashMenu: false/);
});

test("comments are the note's chat thread, written the way the chat writes", () => {
  const page = readNote("page.js");
  assert.match(page, /threadSvc\("post"\)/);
  assert.match(page, /threadSvc\("messages"\)/);
  // the chat composer stores < and > as entities; a comment must match it,
  // or the chat thread would render it as markup
  assert.match(page, /"<": "&#60;", ">": "&#62;"/);
  // and what is read back is shown as TEXT
  assert.match(page, /new DOMParser\(\)\.parseFromString/);
  assert.match(readNote("skeleton/comments.js"), /_\.escape\(plainText\(m\.message\)\)/);
});

test("BlockNote's own UI is localised, from ITS dictionaries not ours", () => {
  // The "/" menu, the drag-handle menus, the selection toolbar and the
  // placeholder that teaches people "/" exists are English out of the box,
  // while Drumee ships six languages. For a Khmer or Vietnamese reader that
  // placeholder is noise, not a hint.
  //
  // These are BlockNote's OWN translations — it ships en/es/fr/ru/zh, every
  // Drumee language except Khmer, which falls back to English exactly as the
  // app itself does for a page with no <html lang>.
  const state = readFileSync(
    resolve(ROOT, "src/drumee/builtins/editor/blocknote/state.js"), "utf8");
  assert.match(state, /from "@blocknote\/core\/locales"/);
  // 🚨 NAMED imports, never the namespace: the barrel carries 23 languages and
  // only the referenced ones tree-shake away. `import * as` would ship them all.
  assert.ok(
    !/import \* as \w+ from "@blocknote\/core\/locales"/.test(state),
    "the whole locale barrel must not be pulled in"
  );
  assert.match(state, /import \{ en, es, fr, ru, zh \}/);
  // every dictionary imported is one the app can actually reach
  const dict = /const DICTIONARIES = \{([^}]*)\}/.exec(state);
  assert.ok(dict, "the language map is gone");
  const langs = dict[1].split(",").map((x) => x.trim()).filter(Boolean).sort();
  assert.deepStrictEqual(langs, ["en", "es", "fr", "ru", "zh"]);
  // and it is read from the SAME place the rest of the app reads it
  assert.match(state, /bootstrap\(\)\.lang/);
  assert.match(state, /DICTIONARIES\[lang\] \|\| DICTIONARIES\.en/,
    "an unknown language must fall back, not render blank");
  // the editors the user actually sees must be given it
  const creates = state.match(/BlockNoteEditor\.create\(/g) || [];
  const withDict = state.match(/BlockNoteEditor\.create\(\{[^}]*dictionary: dictionary\(\)/g) || [];
  assert.strictEqual(creates.length - withDict.length, 1,
    "only the throwaway markdown parser may skip the dictionary — it renders nothing"
  );
});

test("no icon is added to the sprite that nothing references", () => {
  // The sprite is injected at boot — it was ~900 KB of the 2.8 MB the app
  // loads before it shows anything — so an icon left behind after a design
  // change is a cost every user pays forever, for nothing. Three icons were
  // tried and dropped for this one button alone.
  const { readdirSync } = require("node:fs");
  const dir = resolve(ROOT, "icons/src/normalized");
  const src = readdirSync(resolve(ROOT, "src"), { recursive: true })
    .filter((f) => typeof f === "string" && /\.(js|scss)$/.test(f))
    .map((f) => readFileSync(resolve(ROOT, "src", f), "utf8"))
    .join("\n");
  // only the icons this feature introduced; the rest of the sprite is not ours
  const mine = [
    "ph-text-t", "ph-list-bullets", "ph-list-numbers", "ph-list-checks", "ph-quotes",
    "ph-line-vertical", "ph-image", "ph-video", "ph-speaker-high", "ph-code", "ph-paperclip",
    "ph-table", "ph-smiley", "ph-chat-text", "ph-lock-key", "ph-download-simple", "ph-gear",
    "ph-arrows-out-simple", "ph-cloud-arrow-up", "ph-at", "ph-arrow-circle-up",
    "ph-magnifying-glass", "ph-leaf", "ph-hamburger", "ph-airplane-tilt", "ph-football",
    "ph-lightbulb", "ph-peace", "ph-flag",
  ];
  for (const ico of mine) {
    assert.ok(
      existsSync(resolve(dir, `${ico}.svg`)),
      `${ico}.svg is referenced but missing from the sprite source`
    );
    assert.ok(src.includes(`"${ico}"`), `${ico}.svg is in the sprite but unused`);
  }
  // and the ones that were tried and rejected are gone again
  for (const dead of ["ph-toolbox", "ph-sidebar-simple", "ph-faders", "ph-text-h-one", "ph-check-square"]) {
    assert.ok(!existsSync(resolve(dir, `${dead}.svg`)), `${dead}.svg was left behind`);
  }
});

test("markdown is NEVER written back", () => {
  // The guarantee the whole migration rests on. BlockNote's own API says the
  // export "un-nests children and removes certain styles"
  // (`blocksToMarkdownLossy`), so a save-as-markdown would shave content off
  // the document on every round trip. An old note is read, then converted once
  // — it is never re-serialised to markdown.
  for (const f of [
    "src/drumee/builtins/editor/blocknote/index.js",
    "src/drumee/builtins/editor/blocknote/state.js",
    "src/drumee/libs/blocknote-format.js",
  ]) {
    const src = readFileSync(resolve(ROOT, f), "utf8");
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    assert.ok(
      !/blocksToMarkdownLossy|toMarkdown/.test(code),
      `${f} must not serialise the document to markdown`
    );
  }
});

test("an export is always a NEW file — it can never overwrite the note", () => {
  // Export writes .md / .html / .pdf … next to the note. That is the ONE place
  // markdown is produced, and it must stay a separate node: media.save
  // replaces whatever `id` it is given, so an export that sent the note's id
  // would write the lossy markdown over the note itself.
  const src = readFileSync(
    resolve(ROOT, "src/drumee/builtins/editor/blocknote/index.js"),
    "utf8"
  );
  const m = src.match(/async _saveExport\([^)]*\) \{([\s\S]*?)\n  \}/);
  assert.ok(m, "_saveExport exists");
  const body = m[1].replace(/\/\/.*$/gm, "");
  assert.ok(/nid: dest\.pid/.test(body), "an export is addressed to the FOLDER");
  assert.ok(!/\bid\s*:/.test(body), "an export never sends an `id` (that would be a replace)");
  assert.ok(!/this\.mget\(_a\.nid\)/.test(body), "an export never uses the note's nid");
});

test("the editor saves the NEW extension, which is what converts the node", () => {
  // media.save renames in place for the same nid, so writing `<name>.dnote`
  // against an existing markdown node converts it: one node, same id, the name
  // the user sees unchanged. If this ever wrote the old extension back, the
  // note would stay markdown and be re-imported, lossily, on every open.
  const src = readFileSync(
    resolve(ROOT, "src/drumee/builtins/editor/blocknote/index.js"), "utf8");
  assert.match(src, /filename: `\$\{filename\}\.\$\{EXT\}`/);
  assert.match(src, /id: nid/, "the save must target the SAME node");
});

test("opening an old note does not convert it", () => {
  // A conversion is a write. onChange can fire while an editor mounts with
  // imported content, and that alone would convert a file somebody only
  // opened — which matters because a markdown file might be a README, not a
  // note. An imported note therefore waits for a real input event.
  const src = readFileSync(
    resolve(ROOT, "src/drumee/builtins/editor/blocknote/state.js"), "utf8");
  assert.match(
    src,
    /if \(this\._converted && !this\._userTouched\) return;/,
    "an imported note must ignore changes until the user actually edits"
  );
  // `input`, not `beforeinput`: measured in a browser, ProseMirror takes
  // `beforeinput` and only `input` reaches the widget element. Arming on
  // `beforeinput` alone makes an imported note permanently unsaveable.
  assert.match(src, /"input", "beforeinput", "keydown", "paste", "drop", "cut"/,
    "the guard must arm on the event that actually arrives");
  // The guard is scoped to imported notes: a .dnote opens and behaves exactly
  // as it did before this migration.
  assert.match(src, /if \(this\._converted\) this\._armUserEdits\(\);/);
});

test("an unreadable old note is not replaced by an empty one", () => {
  // Same guard as a corrupt .dnote: a markdown file that imports to nothing is
  // a failed read, not an empty note, or autosave would blank it.
  const src = readFileSync(
    resolve(ROOT, "src/drumee/builtins/editor/blocknote/state.js"), "utf8");
  assert.match(src, /_failLoad\("markdown-empty"\)/);
  assert.match(src, /_failLoad\("markdown-import"\)/);
  // ...but a genuinely empty file is fine to open as a new note.
  assert.match(src, /if \(!md\.trim\(\)\)/);
});

test("an old note that imports as a blank page opens READ-ONLY", () => {
  // 2026-10-22: a README opening with `<!-- … -->` parsed to ONE empty
  // paragraph. That passed the `!blocks.length` guard, mounted editable, and
  // the first keystroke would have converted 7.7 KB of markdown into nothing.
  const state = readNote("state.js");
  assert.match(state, /tryParseMarkdownToBlocks\(md\.replace\(\/<!--\[\\s\\S\]\*\?-->\/g, ""\)\)/,
    "HTML comments are dropped before parsing");
  assert.match(state, /if \(!Array\.isArray\(blocks\) \|\| !blocks\.length \|\| isBlank\(blocks\)\) \{\s*this\._failLoad\("markdown-empty"\);/);
  // and isBlank means "no text, no children", nothing looser
  const fn = state.slice(state.indexOf("function isBlank"), state.indexOf("function isBlank") + 400);
  assert.match(fn, /b\.type === "paragraph"/);
  assert.match(fn, /b\.children && b\.children\.length/);
  assert.match(fn, /\.trim\(\)/);
});

test("an untitled note is a \"New page\" (Figma), in the title, the header and the saved name", () => {
  assert.match(readNote("skeleton/index.js"), /placeholder: LOCALE\.NOTE_NEW_PAGE/);
  assert.match(readNote("skeleton/topbar.js"), /title: filename \|\| LOCALE\.NOTE_NEW_PAGE/);
  assert.match(readNote("index.js"), /this\._assignedName \|\|\s*LOCALE\.NOTE_NEW_PAGE/);
  assert.ok(!/LOCALE\.UNTITLED/.test(readNote("index.js") + readNote("skeleton/index.js") + readNote("skeleton/topbar.js")));
});

test("the note sits in the Open-File Switcher frame, and saves before a switch closes it", () => {
  // Every other viewer/editor opened from a folder carries the panel; the
  // note was the one left out.
  const skl = readNote("skeleton/index.js");
  assert.match(skl, /require\("builtins\/player\/widget\/file-switcher\/frame"\)/);
  assert.match(skl, /return withFileSwitcher\(\s*_ui_,/);
  // The switcher closes the editor only once saveBeforeClose() says so; a
  // failed save must answer false, or the note is closed with edits lost.
  const win = readNote("index.js");
  assert.match(win, /saveBeforeClose\(\) \{/);
  for (const site of ["if (!dest) return this._settleClose(false);", "if (content == null) return this._settleClose(false);"]) {
    assert.ok(win.includes(site), `a save that cannot run must answer false: ${site}`);
  }
  assert.match(win, /this\._setStatus\("unsaved"\);\s*this\._settleClose\(false\);/);
  assert.match(win, /this\._settleClose\(true\);\s*if \(close\) this\.goodbye\(\);/);
});

test("the Open-File Switcher draws a note with the Note's glyph, not the shrunk desk card", () => {
  const sk = readFileSync(resolve(ROOT, "src/drumee/builtins/player/widget/file-switcher/skeleton/index.js"), "utf8");
  assert.match(sk, /node\.filetype === _a\.note \|\| node\.filetype === "markdown"/);
  assert.match(sk, /ico: "raw-note-sticky", className: "preview-icon"/);
  assert.ok(existsSync(resolve(ROOT, "icons/src/raw/note-sticky.svg")));
  // every other file keeps the shared node icon
  assert.match(sk, /content: nodeIconHtml\(node, \{/);
});

// ── the Note's glyph outside the editor (Duy, 2026-10-26) ───────────────────
// Every place a note is drawn or created shows the yellow note glyph
// (raw-note-sticky), the way test made the Casual files' glyphs (fe52eac73).

test("the file icon of a note is the Note's glyph; every other icon is unchanged", () => {
  const restore = installGlobals();
  try {
    Object.assign(global._a, { note: "note", web: "web", document: "document", image: "image" });
    for (const f of [
      "src/drumee/builtins/media/template/icon-name.js",
      "src/drumee/builtins/panel/activity/item/skeleton/template/icon-name.js",
    ]) {
      const iconName = require(resolve(ROOT, f));
      for (const m of [{ filetype: "note" }, { filetype: "drumee.note" }, { filetype: "web", dataType: "drumee.note" }]) {
        const r = iconName({ ...m, imgCapable: true });
        assert.equal(r.chartId, "raw-note-sticky", `${f} ${JSON.stringify(m)}`);
      }
      // regression: what was not a note keeps its own icon
      assert.equal(iconName({ filetype: "markdown" }).chartId, "raw-markdown");
      assert.equal(iconName({ filetype: "image" }).chartId, "desktop_picture");
      assert.equal(iconName({ filetype: "document", ext: "docx" }).chartId, "raw-documents_word");
      assert.ok(!readFileSync(resolve(ROOT, f), "utf8").includes("raw-ab_notes"));
    }
    const media = require(resolve(ROOT, "src/drumee/builtins/media/template/icon-name.js"));
    assert.equal(media({ ext: "udoc" }).chartId, "raw-documents_udoc");
  } finally { restore(); }
});

test("a grid preview can be told its glyph, and is then never a picture", () => {
  const restore = installGlobals();
  const saved = { Visitor: global.Visitor, Template: global.Template };
  global.Visitor = { inDmz: false };
  global.Template = { Xmlns: (id) => `<use href="#--icon-${id}"></use>`, SvgText: (t) => `<text>${t}</text>` };
  try {
    Object.assign(global._a, { note: "note", video: "video" });
    const preview = require(resolve(ROOT, "src/drumee/builtins/media/grid/template/preview.js"));
    const html = preview({ filetype: "markdown", ext: "md", imgCapable: true, url: "x.png", _id: "a" }, "raw-note-sticky");
    assert.match(html, /#--icon-raw-note-sticky/);
    assert.ok(!/background-image/.test(html), "a glyph is never drawn as the file's picture");
    // without a glyph: what it always drew
    const img = preview({ filetype: "image", imgCapable: true, url: "x.png", _id: "b" });
    assert.match(img, /background-image:url\(x\.png\)/);
  } finally { Object.assign(global, saved); restore(); }
});

test("the folder grid, its vignette and the chat node icon draw a note with the glyph, not the lined page", () => {
  for (const f of [
    "src/drumee/builtins/media/grid/template/index.js",
    "src/drumee/builtins/media/grid/template/vignette.js",
    "src/drumee/builtins/widget/chat/node-icon.js",
  ]) {
    const src = readFileSync(resolve(ROOT, f), "utf8");
    assert.ok(!src.includes("filetype/note.txt"), `${f} still draws the lined-page card`);
    assert.match(src, /\(m(odel)?, ['"]raw-note-sticky['"]\)/, `${f} must pass the Note's glyph`);
  }
});

test("every Create-Note button carries the Note's glyph", () => {
  const restore = installGlobals();
  try {
    const { createEntries } = require("../src/drumee/modules/desk/skeleton/create-items.js");
    assert.equal(createEntries(true).find((e) => e.service === "new-note").ico, "raw-note-sticky");
    const { createRows } = requireEsmish("src/drumee/builtins/window/skeleton/toolkit/new-menu-rows.js");
    const ui = { fig: { group: "window" }, mget: () => "personal" };
    const row = createRows(ui).find((r) => r && r.service === "add-blocknote");
    assert.ok(JSON.stringify(row).includes('"raw-note-sticky"'), "workspace + New row");
  } finally { restore(); }
  const ctx = readFileSync(resolve(ROOT, "src/drumee/builtins/contextmenu/skeleton/items.js"), "utf8");
  assert.match(ctx, /ico: 'raw-note-sticky', label: LOCALE\.NOTE, service: 'new-note'/);
  const tour = readFileSync(resolve(ROOT, "src/drumee/modules/desk/tutorial/skeleton/toolkit/files-grid.js"), "utf8");
  assert.match(tour, /ico: "raw-note-sticky", name: "note"/);
  for (const f of [
    "src/drumee/modules/desk/skeleton/create-items.js",
    "src/drumee/builtins/window/skeleton/toolkit/new-menu-rows.js",
    "src/drumee/builtins/contextmenu/skeleton/items.js",
    "src/drumee/modules/desk/tutorial/skeleton/toolkit/files-grid.js",
  ]) {
    assert.ok(!readFileSync(resolve(ROOT, f), "utf8").includes("addmenu-note"), f);
  }
});

test("the Open-File Switcher's Create new file offers a Note, on every deployment", () => {
  const sk = readFileSync(resolve(ROOT, "src/drumee/builtins/player/widget/file-switcher/skeleton/index.js"), "utf8");
  const line = /\{ type: "note",[^}]*\}/.exec(sk);
  assert.ok(line, "the Note row is missing");
  assert.match(line[0], /kind: "editor_blocknote"/);
  assert.match(line[0], /ico: "raw-note-sticky"/);
  assert.match(line[0], /label: "NOTE"/);
  assert.ok(!/casual: true/.test(line[0]), "the Note is not a dev-only Casual row");
  // a kind row goes through createCasual, which hands the editor the folder
  assert.match(sk, /service: kind \? "create-casual" : "create-file"/);
  const idx = readFileSync(resolve(ROOT, "src/drumee/builtins/player/widget/file-switcher/index.js"), "utf8");
  assert.match(idx, /kind, folder: \{ nid: pid, hub_id \}, target/);
  const skin = readFileSync(resolve(ROOT, "src/drumee/builtins/player/widget/file-switcher/skin/index.scss"), "utf8");
});

test("a note created from the switcher saves into the LISTED folder, not the active window", () => {
  const win = readNote("index.js");
  // initialize: the folder is taken, and only a window showing it gets the tile
  assert.match(win, /if \(!this\.media && opt\.folder && opt\.folder\.nid && opt\.folder\.hub_id\) \{/);
  assert.match(win, /this\._folder = \{ pid: nid, hub_id \};/);
  assert.match(win, /t\.getCurrentNid\(\) == nid &&\s*t\.mget\(_a\.hub_id\) == hub_id/);
  // only a window that holds tiles: a player's getCurrentNid is its file's folder too
  assert.match(win, /\[opt\.target, viewer, viewer && viewer\.media && viewer\.media\.logicalParent\]/);
  assert.match(win, /_\.isFunction\(t\.insertMedia\) &&/);
  // _saveTarget: the folder wins over whatever is active
  const st = win.slice(win.indexOf("_saveTarget() {"));
  assert.ok(st.indexOf("if (this._folder)") < st.indexOf("Wm.getActiveWindow()"),
    "the switcher's folder must be checked before the active window");
  // an export with no folder window still works (no TypeError on null)
  assert.match(win, /if \(target && _\.isFunction\(target\.canUpload\) && !target\.canUpload\(\)\) return null;/);
});

test("the Note's glyph is soft in itself: the Figma's 70% baked into its colours, not re-applied", () => {
  const svg = readFileSync(resolve(ROOT, "icons/src/raw/note-sticky.svg"), "utf8");
  // #FFDA45 / #FFAE18 at 70% over white (Duy, 2026-10-26: "đỡ chói")
  assert.match(svg, /fill="#FFE57D"/);
  assert.equal((svg.match(/fill="#FFC65D"/g) || []).length, 3);
  assert.ok(!/#FFDA45|#FFAE18/i.test(svg), "the glaring colours are gone");
  const sprite = readFileSync(resolve(ROOT, "icons/sprites/raw.sprite.svg"), "utf8");
  const sym = sprite.slice(sprite.indexOf('id="--icon-raw-note-sticky"'));
  assert.match(sym.slice(0, sym.indexOf("</symbol>")), /#FFE57D/i, "sprite rebuilt");
  // so nothing dims it a second time
  const header = readNote("skin/index.scss");
  const rule = header.slice(header.indexOf(".drumee-topbar__filetype-icon {"));
  assert.ok(!/opacity/.test(rule.slice(0, rule.indexOf("}"))), "header must not dim it again");
  const skin = readFileSync(resolve(ROOT, "src/drumee/builtins/player/widget/file-switcher/skin/index.scss"), "utf8");
  assert.ok(!/row-icon--note \.preview-icon/.test(skin), "switcher must not dim it again");
});

test("a link to a .dnote (filetype note) opens the Note editor; a real legacy note keeps editor_note", async () => {
  const restore = installGlobals();
  const saved = {};
  for (const k of ["SERVICE", "Kind", "Backbone", "Wm"]) saved[k] = global[k];
  const _rf = Module._resolveFilename;
  Module._resolveFilename = function (request, ...rest) {
    if (request.startsWith("window/")) request = resolve(ROOT, "src/drumee/builtins", request);
    return _rf.call(this, request, ...rest);
  };
  try {
    Object.assign(global._a, { note: "note", hub: "hub", folder: "folder", contact: "contact", media: "media", ext: "ext", extension: "extension", mimetype: "mimetype" });
    let launched = null;
    global.SERVICE = { media: { attributes: "media.attributes" } };
    global.Backbone = { Model: class { constructor(a) { this.a = a; } } };
    global.Kind = { waitFor: async () => class { constructor({ model }) { this.model = model; } mget(k) { return this.model.a[k]; } } };
    global.Wm = { launch: (o) => (launched = o), alert: () => {} };
    const { launchPlayer } = require("../src/drumee/libs/open-media.js");
    const app = require("../src/drumee/builtins/window/configs/application.js");
    // what a compact link resolves to: filetype only, no ext
    const opt = app("note", { nid: "n1", hub_id: "h1", filetype: "note" });
    assert.equal(opt.kind, "editor_note", "precondition: the link alone names the legacy editor");
    await launchPlayer({ opt: { ...opt }, node: { nid: "n1", hub_id: "h1", filetype: "note", ext: "dnote" } }, {});
    assert.equal(launched.kind, "editor_blocknote", ".dnote must reach the Note editor");
    await launchPlayer({ opt: { ...opt }, node: { nid: "n2", hub_id: "h1", filetype: "note", ext: "note" } }, {});
    assert.equal(launched.kind, "editor_note", "a legacy note is untouched");
  } finally {
    Module._resolveFilename = _rf;
    Object.assign(global, saved);
    restore();
  }
});

// ── review of #788 (Codex, 2026-10-29) ──────────────────────────────────────
// The editor window itself, loaded for real with its framework base stubbed:
// what it does with a save in flight, the X button, the tab's beforeunload,
// and a reader's permissions.

function loadEditor() {
  const stubs = {
    "player/interact": class {
      constructor() { this._m = {}; }
      mget(k) { return this._m[k]; }
      mset(k, v) { if (typeof k === "object") Object.assign(this._m, k); else this._m[k] = v; }
      warn() {}
    },
    "@drumee/ui-core/vendor": { TweenMax: {}, Expo: {} },
    "builtins/player/widget/share": {},
    "./page": { paint() {}, onPartReady() { return false; }, onUiEvent() { return false; }, destroy() {} },
  };
  const _load = Module._load;
  Module._load = function (request, ...rest) {
    if (Object.prototype.hasOwnProperty.call(stubs, request)) return stubs[request];
    return _load.call(this, request, ...rest);
  };
  try {
    return requireEsmish("src/drumee/builtins/editor/blocknote/index.js").default;
  } finally {
    Module._load = _load;
  }
}

// An editor with an open note, a save we resolve by hand, and no DOM.
function editorWithPendingSaves() {
  const Editor = loadEditor();
  const ed = Object.create(Editor.prototype);
  ed._m = { nid: "n1" };
  ed._state = { getContent: () => "content" };
  ed._saveTarget = () => ({ target: null, pid: "p1", hub_id: "h1" });
  ed._noteName = () => "Note";
  ed._setStatus = (s) => { ed._status = s; };
  const saves = [];
  ed.postService = () => new Promise((resolve) => saves.push(resolve));
  const flush = () => new Promise((r) => setImmediate(r));
  const stopTimer = () => { clearTimeout(ed._timer); ed._timer = null; };
  return { ed, saves, flush, stopTimer };
}

function withEditorGlobals(fn) {
  const restore = installGlobals();
  const saved = {};
  for (const k of ["_", "_e", "SERVICE", "Visitor", "window"]) saved[k] = global[k];
  Object.assign(global._a, { nid: "nid", id: "id", position: "position", service: "service", name: "name", save: "save", hub_id: "hub_id" });
  global._ = require("lodash");
  global._e = { close: "close" };
  global.SERVICE = { media: { save: "media.save" } };
  global.Visitor = { inDmz: 0 };
  // the desk: no share window manager
  global.window = { Wm: { mget: () => null } };
  return Promise.resolve()
    .then(fn)
    .finally(() => { Object.assign(global, saved); restore(); });
}

test("an edit made while a save is in flight is still unsaved when that save lands", () =>
  withEditorGlobals(async () => {
    const { ed, saves, flush, stopTimer } = editorWithPendingSaves();
    ed.markDirty(); stopTimer();
    ed.saveContent();                      // carries edit 1
    ed.markDirty(); stopTimer();           // edit 2, typed during the request
    saves[0]({ nid: "n1" }); await flush();
    assert.equal(ed._changed, 1, "edit 2 is not in the file yet");
    assert.equal(ed._status, "unsaved");
    // with nothing typed during the request, the save clears it as before
    ed.saveContent();
    saves[1]({ nid: "n1" }); await flush();
    assert.equal(ed._changed, 0);
    assert.equal(ed._status, "saved");
  }));

test("closing during a save writes the newer edits before it lets the window go", () =>
  withEditorGlobals(async () => {
    const { ed, saves, flush, stopTimer } = editorWithPendingSaves();
    ed.markDirty(); stopTimer();
    ed.saveContent();
    ed.markDirty(); stopTimer();
    let answer;
    ed.saveBeforeClose().then((ok) => (answer = ok));
    saves[0]({ nid: "n1" }); await flush();
    assert.equal(answer, undefined, "not answered on the older save");
    assert.equal(saves.length, 2, "a second save carries the newer edits");
    saves[1]({ nid: "n1" }); await flush();
    assert.equal(answer, true);
    assert.equal(ed._changed, 0);
  }));

test("closing during a save that already holds every edit adds no extra save", () =>
  withEditorGlobals(async () => {
    const { ed, saves, flush, stopTimer } = editorWithPendingSaves();
    ed.markDirty(); stopTimer();
    ed.saveContent();
    let answer;
    ed.saveBeforeClose().then((ok) => (answer = ok));
    saves[0]({ nid: "n1" }); await flush();
    assert.equal(answer, true);
    assert.equal(saves.length, 1);
  }));

test("the note's X saves before it closes, like every other editor's", () =>
  withEditorGlobals(() => {
    const Editor = loadEditor();
    const ed = Object.create(Editor.prototype);
    const calls = [];
    ed.closeAfterSave = () => calls.push("closeAfterSave");
    ed.goodbye = () => calls.push("goodbye");
    ed.onUiEvent({ get: (k) => (k === "service" ? "close" : undefined) });
    assert.deepEqual(calls, ["closeAfterSave"]);
  }));

test("leaving the tab with unsaved edits cancels beforeunload (a returned string is ignored there)", () =>
  withEditorGlobals(() => {
    const Editor = loadEditor();
    const ed = Object.create(Editor.prototype);
    const ev = () => ({ prevented: 0, preventDefault() { this.prevented = 1; } });
    let e = ev();
    ed._changed = 1;
    ed.checkUnsavedWork(e);
    assert.equal(e.prevented, 1);
    assert.equal(e.returnValue, "CONFIRM_QUIT");
    for (const state of [{ _changed: 0 }, { _changed: 1, _readOnly: 1 }]) {
      e = ev();
      Object.assign(ed, state);
      assert.equal(ed.checkUnsavedWork(e), undefined);
      assert.equal(e.prevented, 0, `no prompt for ${JSON.stringify(state)}`);
    }
  }));

test("a reader of the note gets a read-only body, and nothing of theirs is saved", () =>
  withEditorGlobals(() => {
    const Editor = loadEditor();
    const ed = Object.create(Editor.prototype);
    ed._setStatus = (s) => { ed._status = s; };
    ed.media = { canUpload: () => false };
    assert.equal(ed.isViewOnly(), true);
    ed.markDirty();
    assert.equal(ed._changed, undefined, "no edit is recorded");
    assert.equal(ed._timer, undefined, "no autosave is armed");
    ed.markConverting();
    assert.equal(ed._status, undefined, "a reader is not told the note upgrades on save");
    ed.media = { canUpload: () => true };
    assert.equal(ed.isViewOnly(), false);
    ed.media = null;
    assert.equal(ed.isViewOnly(), false, "a brand-new note belongs to its author");
    // the body follows it (blocknote_state mounts BlockNoteView with `editable`)
    assert.match(readNote("state.js"), /this\._editable = !opt\.readOnly && !viewOnly;/);
  }));

test("a note written by a NEWER format version opens read-only instead of being rewritten", () => {
  const raw = (v) => JSON.stringify({ app: "drumee.blocknote", version: v, blocks: [] });
  assert.equal(fmt.parse(raw(fmt.VERSION + 1)).error, "newer-version");
  assert.equal(fmt.parse(raw(fmt.VERSION)).error, undefined);
  // a file with no version field is read as this one
  assert.equal(fmt.parse(JSON.stringify({ app: "drumee.blocknote", blocks: [] })).error, undefined);
});

test("the content URL fallback goes through the shared builder that adds the share key", () => {
  const st = readNote("state.js");
  const fn = st.slice(st.indexOf("_sourceUrl() {"));
  assert.match(fn.slice(0, fn.indexOf("\n  }\n")), /require\("\.\.\/content-url"\)\.contentUrl\(null, \{ nid, hub_id \}\)/);
});

// ── secure share (DMZ): the share's edit gate ───────────────────────────────

function shareboxStub({ authenticated, write }) {
  const shown = [];
  return {
    shown,
    mget: (k) => ({ is_authenticated: authenticated, uid: "u2", creator_id: "u1", privilege: write ? 2 : 1 })[k],
    havePermission: (bit, priv) => (priv & bit) === bit,
    _gateFor(hasGrant) { return !authenticated ? "signup" : hasGrant ? null : "request"; },
    _gateInteraction(hasGrant) { const g = this._gateFor(hasGrant); if (g) shown.push(g); return !!g; },
  };
}

function fakeBody({ tagName = "DIV", hasInput = false } = {}) {
  const listeners = {};
  const attrs = {};
  return {
    tagName,
    listeners,
    attrs,
    setAttribute: (k, v) => (attrs[k] = v),
    hasAttribute: (k) => k in attrs,
    querySelector: () => (hasInput ? {} : null),
    addEventListener: (ev, fn) => (listeners[ev] = fn),
  };
}

const keyEvent = (key) => ({
  type: "keydown", key, prevented: 0, stopped: 0,
  preventDefault() { this.prevented = 1; }, stopPropagation() { this.stopped = 1; },
});

function inShare(sb, fn, { touch = false } = {}) {
  return withEditorGlobals(() => {
    const savedK = global._K, savedWm = global.window;
    global._K = { permission: { write: 2 } };
    Object.assign(global._a, { privilege: "privilege", open: "open" });
    global.window = {
      Wm: sb ? { isDmz: 1, mget: (k) => (k === "desk" ? sb : null) } : { mget: () => null },
      matchMedia: (q) => ({ matches: touch && q === "(hover: none)" }),
    };
    try { return fn(loadEditor()); } finally { global._K = savedK; global.window = savedWm; }
  });
}

test("in a share, an anonymous visitor gets a read-only body and meets the sign-up gate on typing", () => {
  const sb = shareboxStub({ authenticated: false, write: true });
  return inShare(sb, (Editor) => {
    const ed = Object.create(Editor.prototype);
    // the creator's privilege, as a public share reports it to a guest
    ed.media = { canUpload: () => true };
    assert.equal(ed.isViewOnly(), true);
    const body = fakeBody();
    ed._wireShareEditGate(body);
    assert.equal(body.attrs.tabindex, "-1", "focusable, so keystrokes reach the gate");
    const reading = keyEvent("ArrowDown");
    body.listeners.keydown(reading);
    assert.equal(reading.prevented, 0);
    assert.deepEqual(sb.shown, [], "reading never gates");
    const typing = keyEvent("a");
    body.listeners.keydown(typing);
    assert.equal(typing.prevented, 1);
    assert.deepEqual(sb.shown, ["signup"]);
    const paste = { type: "paste", preventDefault() { this.prevented = 1; }, stopPropagation() {} };
    ed._dmzEditGatedAt -= 1000;
    body.listeners.paste(paste);
    assert.equal(paste.prevented, 1, "a mouse paste is gated too");
  });
});

test("in a share, a recipient holding the edit grant types as usual and is never gated", () => {
  const sb = shareboxStub({ authenticated: true, write: true });
  return inShare(sb, (Editor) => {
    const ed = Object.create(Editor.prototype);
    ed.media = { canUpload: () => true };
    assert.equal(ed.isViewOnly(), false);
    const body = fakeBody();
    ed._wireShareEditGate(body);
    const typing = keyEvent("a");
    body.listeners.keydown(typing);
    assert.equal(typing.prevented, 0);
    assert.deepEqual(sb.shown, []);
  });
});

test("on the desk nothing of the share gate is installed", () =>
  inShare(null, (Editor) => {
    const ed = Object.create(Editor.prototype);
    ed.media = { canUpload: () => true };
    assert.equal(ed.isViewOnly(), false);
    const body = fakeBody();
    ed._wireShareEditGate(body);
    assert.deepEqual(body.listeners, {});
    assert.deepEqual(body.attrs, {}, "the body is not made focusable");
  }));

test("in a share, the page title is read-only for a gated visitor and meets the gate too", () => {
  const sb = shareboxStub({ authenticated: false, write: true });
  return inShare(sb, (Editor) => {
    const ed = Object.create(Editor.prototype);
    ed.media = { canUpload: () => true };
    ed.fig = { family: "editor-blocknote" };
    const body = fakeBody();
    const titleEl = fakeBody({ hasInput: true });
    ed._state = { el: body };
    ed.el = { querySelector: (sel) => (sel === ".editor-blocknote__title-input" ? titleEl : null) };
    ed._wireShareEditGates();
    assert.ok(body.listeners.keydown && titleEl.listeners.keydown, "body and title are both gated");
    assert.equal(titleEl.attrs.tabindex, undefined, "an input is focusable already");
    const typing = keyEvent("N");
    titleEl.listeners.keydown(typing);
    assert.equal(typing.prevented, 1);
    assert.deepEqual(sb.shown, ["signup"]);
    // and a rename that got through anyway is not applied
    ed._m = { filename: "Old" };
    ed.mget = (k) => ed._m[k];
    ed.mset = (o) => Object.assign(ed._m, o);
    ed.onUiEvent({ get: (k) => (k === "service" ? "rename-note" : undefined), getValue: () => "New" });
    assert.equal(ed._m.filename, "Old");
  });
});

test("the page title renders read-only for any reader (Entry's own readonly)", () => {
  assert.match(readNote("skeleton/index.js"), /readonly: _ui_\.isViewOnly\(\) \? 1 : 0,/);
});

test("on a touch screen, a tap in the gated body meets the gate (a link still opens)", () => {
  const sb = shareboxStub({ authenticated: false, write: true });
  return inShare(sb, (Editor) => {
    const ed = Object.create(Editor.prototype);
    ed.media = { canUpload: () => true };
    const body = fakeBody();
    ed._wireShareEditGate(body);
    const tap = (target) => ({ type: "click", target, prevented: 0, preventDefault() { this.prevented = 1; }, stopPropagation() {} });
    const onLink = tap({ closest: (sel) => (sel === "a" ? {} : null) });
    body.listeners.click(onLink);
    assert.equal(onLink.prevented, 0);
    assert.deepEqual(sb.shown, []);
    const onText = tap({ closest: () => null });
    body.listeners.click(onText);
    assert.equal(onText.prevented, 1);
    assert.deepEqual(sb.shown, ["signup"]);
  }, { touch: true });
});

test("with a mouse, a click in the gated body never gates (reading, selecting)", () => {
  const sb = shareboxStub({ authenticated: false, write: true });
  return inShare(sb, (Editor) => {
    const ed = Object.create(Editor.prototype);
    ed.media = { canUpload: () => true };
    const body = fakeBody();
    ed._wireShareEditGate(body);
    const click = { type: "click", target: { closest: () => null }, prevented: 0, preventDefault() { this.prevented = 1; }, stopPropagation() {} };
    body.listeners.click(click);
    assert.equal(click.prevented, 0);
    assert.deepEqual(sb.shown, []);
  });
});

// ── phone layout (Duy, 2026-10-29: "fit và responsive trên điện thoại") ──────
// The page is laid out from the NOTE's own width (data-width), not the
// screen's: on a tablet the sidebar and the File switcher leave the note a
// phone's width while the viewport is wide.

test("the note tags its root with its own width band, and follows it", () =>
  withEditorGlobals(() => {
    const Editor = loadEditor();
    const ed = Object.create(Editor.prototype);
    let width = 390;
    // the page card, right of the File switcher's panel, is what is measured
    const body = { getBoundingClientRect: () => ({ width }) };
    ed.fig = { family: "editor-blocknote" };
    let current = body;
    const styles = {};
    ed.el = {
      dataset: {},
      style: { setProperty: (k, v) => (styles[k] = v) },
      getBoundingClientRect: () => ({ width: width + 250 }),
      querySelector: (sel) => (sel === ".editor-blocknote__body" ? current : null),
    };
    let observed = null;
    const watched = [];
    const savedRO = global.ResizeObserver;
    global.ResizeObserver = class {
      constructor(fn) { observed = fn; }
      observe(el) { watched.push(el); }
      unobserve(el) { watched.splice(watched.indexOf(el), 1); }
      disconnect() {}
    };
    try {
      ed._observeOwnWidth();
      assert.equal(ed.el.dataset.width, "phone", "390px of page in a 640px window is a phone's");
      assert.deepEqual(watched, [ed.el, body], "the window and the page are both watched");
      for (const [w, band] of [[650, "phone"], [651, "narrow"], [900, "narrow"], [901, "wide"], [1600, "wide"], [360, "phone"]]) {
        width = w;
        observed();
        assert.equal(ed.el.dataset.width, band, `${w}px`);
      }
      width = 0;
      observed();
      assert.equal(ed.el.dataset.width, "phone", "a hidden note (0px) keeps its last band");
      // the File switcher frame re-renders the page card: the observer moves to the new one
      current = { getBoundingClientRect: () => ({ width: 1200 }) };
      observed();
      assert.equal(ed.el.dataset.width, "wide");
      assert.deepEqual(watched, [ed.el, current], "the old card is let go, the new one watched");
      assert.equal(styles["--note-page-width"], "1200px", "the page width is published for the skin");
    } finally {
      global.ResizeObserver = savedRO;
    }
    assert.match(readNote("index.js"), /this\._widthObserver\.disconnect\(\)/, "disconnected on destroy");
  }));

test("the phone and narrow layouts key off data-width, never the viewport", () => {
  const skin = readNote("skin/index.scss");
  assert.ok(!/@media \(max-width/.test(skin), "no viewport breakpoint left in the note's skin");
  assert.match(skin, /\$note-phone: '\[data-width="phone"\]';/);
  for (const sel of [
    /&#\{\$note-phone\} &__head \{/,
    /&#\{\$note-phone\} &__page-actions-row\.drumee-box \{\s*flex-wrap: wrap;/,
    /\.editor-blocknote#\{\$note-phone\} \.blocknote-state \{\s*\.bn-editor \{\s*padding-inline: \$note-phone-pad;/,
    /\.editor-blocknote#\{\$note-phone\} \.editor-blocknote-topbar\.drumee-topbar \{/,
    /&__share \.editor-blocknote-topbar__share-label\.drumee-text \{\s*display: none;/,
    // the cover popup is sized against the page, not the viewport
    /width: min\(330px, calc\(var\(--note-page-width, 100vw\) - #\{2 \* \$note-phone-pad\}\)\);/,
  ]) assert.match(skin, sel);
  // Expand is hidden for a phone DEVICE only; a narrow desktop note keeps it
  assert.match(skin, /\.editor-blocknote\[data-device="mobile"\][^{]*__fullscreen\.icon \{\s*display: none;/);
  // a touch screen can reach the cover's Change / Remove
  assert.match(skin, /@media \(hover: none\) \{\s*&__cover-controls\.drumee-box \{\s*display: flex;/);
});

test("a header button's extra class is added to its own, not spread over them", () => {
  const top = readNote("skeleton/topbar.js");
  assert.match(top, /\{ className = "", \.\.\.extra \} = \{\}\) => \(\{/);
  assert.match(top, /className: `icon \$\{pfx\}__icon \$\{className\}`\.trim\(\),/);
  assert.match(top, /className: `\$\{pfx\}__fullscreen`,/);
});
