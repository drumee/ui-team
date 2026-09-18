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
const { readFileSync } = require("node:fs");
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
    for (const key of ["NOTE_BETA", "UNTITLED", "ALL_CHANGES_SAVED", "UNSAVED_CHANGES", "NOTE_UNREADABLE", "NOTE_UPGRADES_ON_SAVE"]) {
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
  assert.match(src, /"beforeinput", "paste", "drop"/,
    "typing, paste and drop all have to arm it");
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
