// "Tasks here are done" — the column-menu switch that writes task_column.is_done.
//
// is_done is what completion is keyed on all over the task window: the
// done/total subtask badge, the completed filters, which column a new task
// lands in, and completed_at on the server. It has existed on every database
// for a long time — but nothing could SET it, so only the seeded built-in
// 'complete' was ever a done column and a board that renamed or replaced its
// columns had no finished column at all. This switch is the writer.
//
// What is pinned here:
//
//  · EVERY DESCENDANT IN THE CLICK PATH CARRIES `active: 0`. ui-core defaults
//    `active` to 1 when it is not set (letc.js: `if (a == null) a = 1`), binds
//    an onclick to EVERY such widget, and __handleClick calls
//    e.stopPropagation() BEFORE triggerHandlers. So a child left at the
//    default eats the click and the row's own service never fires — a click on
//    the label or the knob, which is almost every real click, would silently
//    do nothing. `active` does not cascade and `kidsOpt: {active: 0}` is a
//    no-op, so it has to be written on each node. This exact mistake has cost
//    three bugs in this codebase already.
//  · THE SERVICE NAME RESOLVES. The panel's WebSocket switch has a
//    `case SERVICE.task.column_set_done:`. If that key were missing,
//    SERVICE.task.column_set_done would be undefined and the case would
//    compile to `case undefined:` — which silently swallows every push that
//    arrives with no service. lex/services.json is merged UNDER the backend
//    map at bootstrap, so declaring it there makes the case safe whatever the
//    server answers.
//  · THE WRITE GUARD COVERS IT. task.column_set_done is `src: write`
//    server-side; a view or chat member must be refused before the request,
//    like every other task mutation.
//  · NOTHING IS WRITTEN OPTIMISTICALLY. getColumns() caches on a signature
//    that includes is_done, so flipping the local row before the server
//    confirms would change every completion read in the window on a call that
//    may never have landed — and postService resolves UNDEFINED rather than
//    rejecting when the write guard refuses it.
//  · THE LABEL IS LOCALISED IN ALL SIX FILES, and the SCSS writes font-weight
//    out (drumee.typo maps $weight onto a font-family only and emits no
//    font-weight at all, so a rule that relies on $weight renders at whatever
//    it inherits).
const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync, readdirSync } = require("node:fs");
const { join } = require("node:path");
const { render, walk, find } = require("./helpers/render-skeleton");

const ROOT = join(__dirname, "..");
const PANEL = join(ROOT, "src/drumee/builtins/window/tasks/index.js");
const SKEL = join(ROOT, "src/drumee/builtins/window/tasks/skeleton/index.js");
const SKIN = join(ROOT, "src/drumee/builtins/window/tasks/skin/index.scss");
const panelSrc = readFileSync(PANEL, "utf8");
const skelSrc = readFileSync(SKEL, "utf8");
const skinSrc = readFileSync(SKIN, "utf8");

// Comments explain these hazards at length; a naive grep would match the prose
// instead of the code and pass for the wrong reason.
const stripComments = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

const COL = {
  key: "C1",
  name: "Released",
  theme: "default",
  color: "#AEAEB2",
  is_done: 0,
  position: 0,
  custom: 1,
};

// Render the REAL skeleton with the column menu open on a custom column.
function menuTree(over = {}) {
  const col = { ...COL, ...(over.col || {}) };
  return render({
    getColumns: () => [col],
    getState: () => ({ [col.key]: [] }),
    getColMenuFor: () => col.key,
    getColumnThemes: () => ({ default: "#AEAEB2" }),
    ...(over.ui || {}),
  });
}

test("the done row renders inside the open column menu", () => {
  const tree = menuTree();
  const menu = find(tree, "tasks-panel__col-menu");
  assert.ok(menu, "the column menu renders");
  const row = find(menu, "tasks-panel__col-done-row");
  assert.ok(row, "the done row is inside the menu, not floating elsewhere");
  assert.equal(row.service, "col-done-toggle", "the row carries the click service");
  assert.deepEqual(
    (row.uiHandler || []).length,
    1,
    "uiHandler is an array with the panel in it — a bare object is never dispatched",
  );
  assert.equal(row.taskColumn, COL.key, "the column key rides on the row, so the handler knows which column");
});

test("the switch reflects is_done, in both directions", () => {
  const off = find(menuTree({ col: { is_done: 0 } }), "tasks-panel__col-done-toggle");
  const on = find(menuTree({ col: { is_done: 1 } }), "tasks-panel__col-done-toggle");
  assert.equal(off.dataset.on, 0, "is_done 0 renders the switch off");
  assert.equal(on.dataset.on, 1, "is_done 1 renders the switch on");
  // The skin keys on the attribute, so an undefined value would render
  // data-on="undefined" and match no rule.
  for (const v of [off.dataset.on, on.dataset.on]) {
    assert.ok(v === 0 || v === 1, `data-on is a real 0/1, got ${JSON.stringify(v)}`);
  }
});

test("EVERY descendant in the click path is active: 0", () => {
  const row = find(menuTree(), "tasks-panel__col-done-row");
  const kids = [...walk(row)].filter((n) => n !== row);
  assert.ok(kids.length >= 3, `the row has descendants to check, found ${kids.length}`);
  const offenders = kids
    .filter((n) => n.active !== 0)
    .map((n) => n.className || n.__kind);
  assert.deepEqual(
    offenders,
    [],
    "a descendant left at the default active:1 binds its own onclick and stopPropagation()s the row's handler away — the click dies there",
  );
  // And the row itself must stay active, or nothing fires at all.
  assert.notEqual(row.active, 0, "the row itself stays clickable");
});

test("the label is localised, never a literal", () => {
  const label = find(menuTree(), "tasks-panel__col-done-label");
  assert.ok(label, "the label renders");
  // The helper's LOCALE proxy echoes the key, so the rendered content IS the
  // key name — which is exactly what proves it came from LOCALE.
  assert.equal(label.content, "COLUMN_MARK_DONE", "content comes from LOCALE.COLUMN_MARK_DONE");
  assert.ok(
    /content:\s*LOCALE\.COLUMN_MARK_DONE/.test(stripComments(skelSrc)),
    "and the source really reads it off LOCALE",
  );
});

test("COLUMN_MARK_DONE is mirrored to all six locale files", () => {
  const dir = join(ROOT, "locale");
  const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  assert.equal(files.length, 6, `six locale files, found ${files.length}`);
  const missing = [];
  const empty = [];
  for (const f of files) {
    const d = JSON.parse(readFileSync(join(dir, f), "utf8"));
    if (!("COLUMN_MARK_DONE" in d)) missing.push(f);
    else if (!String(d.COLUMN_MARK_DONE).trim()) empty.push(f);
  }
  // A missing key renders BLANK with no error — the failure nobody sees in
  // review and every non-English user sees immediately.
  assert.deepEqual(missing, [], "every locale defines the key");
  assert.deepEqual(empty, [], "no locale defines it as an empty string");
});

test("SERVICE.task.column_set_done resolves — the WS case is never `case undefined:`", () => {
  const services = JSON.parse(
    readFileSync(join(ROOT, "src/drumee/lex/services.json"), "utf8"),
  );
  assert.equal(
    services.task && services.task.column_set_done,
    "task.column_set_done",
    "declared in the local services map, which is merged UNDER the backend's at bootstrap",
  );
  const code = stripComments(panelSrc);
  assert.ok(
    /case SERVICE\.task\.column_set_done:/.test(code),
    "the panel reacts to a peer flipping the flag",
  );
  assert.ok(
    /SERVICE\.task\.column_set_done,/.test(code),
    "and posts to it by the same key rather than a hardcoded string",
  );
});

test("the write guard covers it", () => {
  const code = stripComments(panelSrc);
  const list = /TASK_MUTATIONS\(\)\s*\{[\s\S]*?return\s*\[([\s\S]*?)\];/.exec(code);
  assert.ok(list, "TASK_MUTATIONS parses");
  const names = [...list[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  assert.ok(
    names.includes("task.column_set_done"),
    "task.column_set_done is guarded like every other src:write task mutation",
  );
  // Regression belt: the entries that were already there must stay.
  for (const kept of [
    "task.column_create",
    "task.column_update",
    "task.column_delete",
    "task.column_reorder",
  ]) {
    assert.ok(names.includes(kept), `${kept} is still guarded`);
  }
});

test("the local row is written only after the server confirms", () => {
  const body = /async _toggleColumnDone\(trigger\) \{[\s\S]*?\n  \}/.exec(panelSrc);
  assert.ok(body, "_toggleColumnDone is found");
  const code = stripComments(body[0]);
  const postAt = code.indexOf("postService");
  const writeAt = code.indexOf("rec.is_done =");
  assert.ok(postAt > -1, "it posts to the server");
  assert.ok(writeAt > -1, "it does update the local row");
  assert.ok(
    writeAt > postAt,
    "the local write happens AFTER the request, not optimistically before it",
  );
  assert.ok(
    /if \(!row \|\| row\.id == null\) return;/.test(code),
    "an empty/undefined response leaves the old value alone — postService resolves undefined when the guard refuses, and that is not a success",
  );
  assert.ok(
    /is_done: next/.test(code),
    "the flipped value is what gets sent",
  );
  assert.ok(
    /nid: this\._scopeNid/.test(code),
    "the folder scope is sent, or the flag would hit every board in the workspace",
  );
  // The done/total subtask badge is `subtask_done` from task.list, counted
  // server-side over the is_done columns — it does NOT follow from the local
  // row. Peers already reload on the push; without this the person who
  // flipped the switch is the only one left looking at the old counts.
  const reloadAt = code.indexOf("this._loadTasks()");
  assert.ok(reloadAt > writeAt, "the tasks are reloaded after the flag moves");
  assert.ok(
    code.indexOf("this._render()") > reloadAt,
    "and rendered after that reload, not before it",
  );
});

test("the switch's own SCSS writes font-weight out", () => {
  // drumee.typo maps $weight onto a font-FAMILY only; it has no branch that
  // emits font-weight, so a rule relying on $weight alone renders at whatever
  // it inherits. Five rules in this repo were silently light for that reason.
  const rule = /&__col-done-label \{([\s\S]*?)\n  \}/.exec(skinSrc);
  assert.ok(rule, "the label rule exists");
  assert.ok(
    /font-weight:\s*\d+;/.test(rule[1]),
    "font-weight is written explicitly, not left to drumee.typo's $weight",
  );
});
