const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const fileGroup = require("../src/drumee/builtins/window/skeleton/toolkit/file-group");
const {
  GROUP,
  GROUP_ORDER,
  VIEW_STATES,
  blocksGroupedArrange,
  bucketByGroup,
  clearGrouped,
  groupOf,
  groupViewState,
  isGrouped,
  nextGroupViewState,
  setGrouped,
} = fileGroup;

const REPO_ROOT = join(__dirname, "..");

function extractClassMethod(source, name) {
  const start = source.indexOf(`  ${name}(`);
  assert.notEqual(start, -1, `${name} not found in production source`);
  const end = source.indexOf("\n  }\n", start);
  assert.notEqual(end, -1, `${name} has no closing brace`);
  const method = source.slice(start, end + 4).trim();
  return `function ${name}${method.slice(name.length)}`;
}

test("the classifier covers all ten ordered folder groups", () => {
  const cases = [
    [{ filetype: "folder" }, GROUP.folder],
    [{ filetype: "document", ext: "docx" }, GROUP.doc],
    [{ filetype: "document", ext: "ods" }, GROUP.sheet],
    [{ filetype: "document", ext: "odp" }, GROUP.slide],
    [{ filetype: "document", ext: "pdf" }, GROUP.pdf],
    [{ filetype: "audio", ext: "mp3" }, GROUP.media],
    [{ filetype: "markdown", ext: "md" }, GROUP.markdown],
    [{ filetype: "document", ext: "json" }, GROUP.json],
    [{ filetype: "web", ext: "html" }, GROUP.html],
    [{ filetype: "unknown" }, GROUP.other],
  ];

  assert.deepEqual(cases.map(([node]) => groupOf(node)), GROUP_ORDER);
  for (const [node, expected] of cases) assert.equal(groupOf(node), expected);
});

test("group buckets preserve rank, fixed order, and empty buckets", () => {
  const items = [
    { id: "other", filetype: "unknown" },
    { id: "pdf-1", filetype: "document", ext: "pdf" },
    { id: "folder", filetype: "folder" },
    { id: "pdf-2", filetype: "document", ext: "pdf" },
  ];
  const buckets = bucketByGroup(items);

  assert.deepEqual([...buckets.keys()], GROUP_ORDER);
  assert.deepEqual(
    [...buckets].filter(([, grouped]) => grouped.length).map(([key]) => key),
    [GROUP.folder, GROUP.pdf, GROUP.other],
  );
  assert.deepEqual(buckets.get(GROUP.pdf).map(({ id }) => id), ["pdf-1", "pdf-2"]);
  assert.deepEqual(buckets.get(GROUP.media), []);
});

test("the Group to List to Grid state cycle is window-local", () => {
  const folder = { cid: "folder-window" };
  setGrouped(folder, true);
  assert.equal(isGrouped(folder), true);
  assert.equal(nextGroupViewState(folder, "icon"), "list");

  setGrouped(folder, false);
  assert.equal(nextGroupViewState(folder, "row"), "grid");
  assert.equal(nextGroupViewState(folder, "icon"), "group");

  clearGrouped(folder);
  assert.equal(isGrouped(folder), false);
});

// Drives the real toggleFilesLayout against a narrow folder stub. `pressed` is
// the mode the segment reports; undefined models a press that names none (the
// gaps in the toggle box, and the two-mode DMZ control).
function pressToggle({ from, pressed }) {
  const folderSource = readFileSync(
    join(REPO_ROOT, "src/drumee/builtins/window/folder/index.js"),
    "utf8",
  );
  // The skeleton factories are stubbed to markers: this test is about which mode
  // the press resolves to, not about the trees that mode renders.
  const toggle = new Function(
    "VIEW_STATES",
    "isGrouped",
    "setGrouped",
    "groupViewState",
    "nextGroupViewState",
    "fileTypeFilterBar",
    "gridFilesBrowser",
    "require",
    "_a",
    "window",
    `return (${extractClassMethod(folderSource, "toggleFilesLayout")});`,
  )(
    VIEW_STATES,
    fileGroup.isGrouped,
    fileGroup.setGrouped,
    groupViewState,
    nextGroupViewState,
    () => "filter-bar",
    () => "grid-browser",
    () => () => "row-content",
    { value: "value", row: "row", icon: "icon", content: "content" },
    { pointerDragged: false },
  );

  const cid = `toggle-${from}-${pressed || "none"}`;
  const folder = { cid };
  setGrouped(folder, from === "group");
  let viewMode = from === "list" ? "row" : "icon";
  const fed = [];

  Object.assign(folder, {
    fig: { family: "window-folder" },
    getViewMode: () => viewMode,
    setViewMode(mode) {
      viewMode = mode;
    },
    ensurePart: () => ({
      then(resolve) {
        // A single feed call is all this test needs to observe; the skeleton
        // factories themselves are covered elsewhere.
        return resolve({ isDestroyed: () => false, feed: (kids) => fed.push(kids) });
      },
    }),
  });

  toggle.call(folder, {
    mget: (key) => key === "value" ? pressed : undefined,
    el: null,
  });

  const state = groupViewState(folder, viewMode);
  clearGrouped(folder);
  return { fed, state };
}

test("pressing a segment selects that mode instead of advancing a cycle", () => {
  // The bug: every press advanced group -> list -> grid regardless of which
  // segment was pressed, because only the container carried the service.
  for (const from of VIEW_STATES) {
    for (const pressed of VIEW_STATES) {
      const { state, fed } = pressToggle({ from, pressed });
      assert.equal(state, pressed, `${from} -> ${pressed}`);
      // Re-pressing the active segment must not rebuild the list.
      assert.equal(fed.length, from === pressed ? 0 : 1, `${from} -> ${pressed} feeds`);
    }
  }
});

test("a press naming no mode still advances the cycle", () => {
  // The toggle box stays clickable in the gaps between segments, and the
  // two-mode DMZ control never sends a mode at all.
  assert.equal(pressToggle({ from: "group" }).state, "list");
  assert.equal(pressToggle({ from: "list" }).state, "grid");
  assert.equal(pressToggle({ from: "grid" }).state, "group");
});

test("groupViewState reports the position the window is showing", () => {
  const folder = { cid: "current-state" };
  setGrouped(folder, true);
  assert.equal(groupViewState(folder, "icon"), "group");

  setGrouped(folder, false);
  assert.equal(groupViewState(folder, "row"), "list");
  assert.equal(groupViewState(folder, "icon"), "grid");
  clearGrouped(folder);
});

// Builds the real fileViewToggle tree so the wiring is asserted as rendered,
// not as source text.
function buildViewToggle(opt) {
  const toolkitSource = readFileSync(
    join(REPO_ROOT, "src/drumee/builtins/window/skeleton/toolkit/index.js"),
    "utf8",
  );
  const start = toolkitSource.indexOf("function fileViewToggle(");
  assert.notEqual(start, -1, "fileViewToggle not found");
  const end = toolkitSource.indexOf("\n}\n", start);
  assert.notEqual(end, -1, "fileViewToggle has no closing brace");

  const preserve = (config) => config;
  const factory = new Function(
    "Skeletons",
    "isGrouped",
    "_a",
    `${toolkitSource.slice(start, end + 2)}\nreturn fileViewToggle;`,
  )(
    { Box: { X: preserve }, Image: { Svg: preserve } },
    fileGroup.isGrouped,
    { row: "row", icon: "icon" },
  );

  const ui = {
    _id: "w1",
    cid: opt.cid,
    fig: { family: "window-folder" },
    getViewMode: () => opt.viewMode,
  };
  return factory(ui, opt.toggleOpt);
}

test("each toggle segment owns the press, and its glyphs stay inert", () => {
  const cid = "toggle-wiring";
  const folder = { cid };
  setGrouped(folder, false);

  const box = buildViewToggle({
    cid,
    viewMode: "icon",
    toggleOpt: {
      namedState: true,
      modes: [
        { mode: "group", ico: "view-group" },
        { mode: "list", ico: "view-list" },
        { mode: "grid", ico: "view-grid" },
      ],
    },
  });

  // THE trap: `kidsOpt: { active: 0 }` on the container propagates down and
  // leaves the segments handler-less, so every press bubbles to the box and
  // cycles — indistinguishable from having no per-segment service at all.
  assert.equal(box.kidsOpt, undefined,
    "the container must not deactivate the segments that own the service");

  assert.equal(box.kids.length, 3);
  for (const [index, mode] of ["group", "list", "grid"].entries()) {
    const seg = box.kids[index];
    assert.equal(seg.service, "toggle-files-layout", mode);
    assert.equal(seg.value, mode, mode);
    assert.equal(seg.radio, "file-view-w1", mode);
    assert.equal(seg.bubble, false, mode);
    // The handler must be the window itself, in an array — onUiEvent never fires
    // for a bare object.
    assert.ok(Array.isArray(seg.uiHandler), mode);
    assert.equal(seg.uiHandler[0], box.uiHandler[0], mode);
    // grid is active for viewMode icon + not grouped
    assert.equal(seg.state, mode === "grid" ? 1 : 0, mode);
    // Glyphs must be inert or a press landing on the icon is swallowed.
    for (const glyph of seg.kids) assert.equal(glyph.active, 0, `${mode} glyph`);
  }

  clearGrouped(folder);
});

test("the two-mode DMZ toggle keeps the box as its only handler", () => {
  const cid = "dmz-toggle";
  const box = buildViewToggle({ cid, viewMode: "icon", toggleOpt: {} });

  // There the box owns the service, so the segments MUST stay inert.
  assert.deepEqual(box.kidsOpt, { active: 0 });
  assert.equal(box.dataset.state, 0);
  for (const seg of box.kids) {
    assert.equal(seg.service, undefined);
    assert.equal(seg.value, undefined);
  }
});

test("grouped arrange blocking preserves folder drop-in and cross-window moves", () => {
  const folder = { cid: "grouped-folder" };
  setGrouped(folder, true);

  assert.equal(blocksGroupedArrange(folder, {}, true), true);
  assert.equal(blocksGroupedArrange(folder, { over: { id: "child-folder" } }, true), false);
  assert.equal(blocksGroupedArrange(folder, {}, false), false);

  clearGrouped(folder);
  assert.equal(blocksGroupedArrange(folder, {}, true), false);
});

test("folder initialization selects icon locally without changing the shared default", () => {
  const utilsSource = readFileSync(
    join(REPO_ROOT, "src/drumee/builtins/window/utils.js"),
    "utf8",
  );
  const folderSource = readFileSync(
    join(REPO_ROOT, "src/drumee/builtins/window/folder/index.js"),
    "utf8",
  );
  const methodSource = extractClassMethod(utilsSource, "setViewMode");
  const ViewMode = new Map([["default", "row"]]);
  const setViewMode = new Function(
    "ViewMode",
    "DEFAULT",
    "_a",
    `return (${methodSource});`,
  )(ViewMode, "default", { icon: "icon" });
  const folder = { cid: "folder-window" };

  setViewMode.call(folder, "icon", false);

  assert.equal(ViewMode.get("folder-window"), "icon");
  assert.equal(ViewMode.get("default"), "row");
  assert.equal(folder.viewMode, "icon");
  assert.match(folderSource, /this\.setViewMode\(_a\.icon, false\)/);
  // The toggle must stay window-local too. Passing "row" to the shared default
  // would make the next Share/Search/Transferbox window open in list view.
  assert.match(
    folderSource,
    /this\.setViewMode\(state === "list" \? _a\.row : _a\.icon, false\)/,
  );
});

test("a rename re-buckets a grouped folder even when the sort bails out", () => {
  const folderSource = readFileSync(
    join(REPO_ROOT, "src/drumee/builtins/window/folder/index.js"),
    "utf8",
  );
  const renameSource = extractClassMethod(folderSource, "onMediaRenamed");

  // _scheduleAlphabeticalGridSort returns early for a hand-arranged folder, so
  // the rename must partition directly or the renamed tile keeps its old group.
  assert.match(renameSource, /isGrouped\(this\)/);
  assert.match(renameSource, /_partitionFoldersAndFiles\(this\.iconsList\)/);
});

test("grouped drags keep no tile shifted for an insertion slot", () => {
  const interactSource = readFileSync(
    join(REPO_ROOT, "src/drumee/builtins/window/interact/index.js"),
    "utf8",
  );

  // Group view never re-arms the flanking tiles, so keeping them in `keep`
  // skips their release and strands them pushed aside until clearShift.
  assert.match(
    interactSource,
    /_releaseShifted\(\s*grouped \? \[\] : \[this\.captured\.left, this\.captured\.right\],\s*\)/,
  );
});
