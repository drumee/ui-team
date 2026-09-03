// The phone's create surface — once the drawer's `create` sub-screen, now the
// "+ New" bottom sheet (Option A of the approved mobile shell). The contract
// it inherits is unchanged; only the surface moved:
//
//   1. the sheet mirrors the desktop "+ New" menu row for row — the two import
//      rows, then the five create entries, then Invite — since Desk.onUiEvent
//      is what handles all of them
//   2. the current-workspace privileges gate exactly as they do in the topbar:
//      write drops the imports and the four file rows, manage drops Invite
//   3. an over-limit org gets nothing actionable, and the "+ New" button that
//      opens the sheet is not rendered at all
const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const {
  render,
  find,
  findAll,
  goTargetsIn,
  labelsIn,
} = require("./helpers/render-mobile-sheets");

const SRC = join(__dirname, "..", "src", "drumee");
const stripComments = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

const S = "desk-module";
// `_e.upload` — the harness's _e proxy echoes keys back as their own name.
const _e_upload = "upload";
const CREATE_SERVICES = [
  "new-workspace",
  "new-note",
  "new-document",
  "new-spreadsheet",
  "new-presentation",
];
const ALL = { mayWrite: true, mayManage: true, locked: false };

test("the create sheet carries every service the topbar group carries", () => {
  const targets = goTargetsIn(render("newSheet", ALL));
  for (const s of CREATE_SERVICES) {
    assert.ok(targets.includes(s), `the sheet offers "${s}"`);
  }
  // Order matters: Workspace leads on every surface.
  assert.deepEqual(
    targets.filter((s) => CREATE_SERVICES.includes(s)),
    CREATE_SERVICES,
  );
});

test("the import rows precede the create group, as they do on desktop", () => {
  const targets = goTargetsIn(render("newSheet", ALL));
  assert.deepEqual(targets.slice(0, 2), [_e_upload, "launch-gdrive-migration"]);
});

test("every row re-dispatches through mobile-sheet-go", () => {
  // The whole point of the sheet design: rows reuse the desktop handlers via
  // one re-dispatching service, so none may fire a real service directly.
  const tree = render("newSheet", ALL);
  const rows = findAll(tree, `${S}__msheet-row`);
  assert.ok(rows.length >= 8, "the full sheet renders its rows");
  for (const r of rows) {
    assert.equal(r.service, "mobile-sheet-go");
    assert.ok(r.goTarget, "each row names its real target");
    // ui-core binds a click that stops propagation on any child that does not
    // opt out — without this the icon or label eats the tap.
    assert.deepEqual(r.kidsOpt, { active: 0 });
  }
});

test("a viewer without write in the current workspace is offered Workspace alone", () => {
  const targets = goTargetsIn(
    render("newSheet", { mayWrite: false, mayManage: true, locked: false }),
  );
  assert.deepEqual(
    targets.filter((s) => CREATE_SERVICES.includes(s)),
    ["new-workspace"],
    "creating a workspace is account-level and stays; the file rows go",
  );
  // The imports land on the upload path, so they follow the same privilege.
  assert.ok(!targets.includes(_e_upload), "no device upload without write");
  assert.ok(!targets.includes("launch-gdrive-migration"), "no Drive import without write");
});

test("Invite follows the manage privilege, not the write privilege", () => {
  const can = goTargetsIn(render("newSheet", ALL));
  assert.ok(can.includes("invite-member"), "a manager is offered Invite");
  const cannot = goTargetsIn(
    render("newSheet", { mayWrite: true, mayManage: false, locked: false }),
  );
  assert.ok(!cannot.includes("invite-member"), "a non-manager is not");
});

test("the office rows carry the template filename Wm.newDocument reads back", () => {
  const byTarget = {};
  for (const n of findAll(render("newSheet", ALL), `${S}__msheet-row`)) {
    byTarget[n.goTarget] = n;
  }
  assert.equal(byTarget["new-document"].name, "document.docx");
  assert.equal(byTarget["new-spreadsheet"].name, "spreadsheet.xlsx");
  assert.equal(byTarget["new-presentation"].name, "presentation.pptx");
  // undefined, not "": a row with no template must not send a blank one.
  assert.equal(byTarget["new-workspace"].name, undefined);
});

test("the Drive row carries the topbar's label", () => {
  const row = findAll(render("newSheet", ALL), `${S}__msheet-row`).find(
    (r) => r.goTarget === "launch-gdrive-migration",
  );
  assert.ok(row, "the row is a sheet row");
  assert.deepEqual(labelsIn(row), ["MIGRATE_GDRIVE_TITLE"]);
});

test("an over-limit org gets nothing actionable", () => {
  const tree = render("newSheet", { mayWrite: true, mayManage: true, locked: true });
  assert.equal(goTargetsIn(tree).length, 0, "no row survives the lock");
});

test('an over-limit org is not offered the "+ New" button at all', () => {
  // Same move the drawer made by dropping its "Add new" row: the surface that
  // opens the create sheet is gated at render, not just emptied on open.
  const skel = stripComments(
    readFileSync(join(SRC, "modules/desk/skeleton/index.js"), "utf8"),
  );
  const btn = skel.indexOf("__mobile-new-btn");
  assert.ok(btn > -1, "the + New button is rendered on the action row");
  const gate = skel.lastIndexOf('require("libs/over-limit").isLocked() ? ""', btn);
  assert.ok(
    btn - gate > 0 && btn - gate < 200,
    "and the over-limit gate sits directly on it",
  );
});

test("the desk resolves the sheet's privileges the way the topbar does", () => {
  const desk = stripComments(
    readFileSync(join(SRC, "modules/desk/index.js"), "utf8"),
  );
  const call = desk.indexOf('.newSheet(this, {');
  assert.ok(call > -1, "the desk builds the sheet with an options object");
  const slice = desk.slice(call, call + 400);
  assert.match(slice, /mayWrite: this\._curWorkspaceCanWrite\(\)/);
  assert.match(slice, /mayManage: this\._curWorkspaceCanManage\(\)/);
  assert.match(slice, /locked: require\("libs\/over-limit"\)\.isLocked\(\)/);
});
