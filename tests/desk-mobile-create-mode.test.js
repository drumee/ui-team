// The mobile drawer's "Add new" row leads to a `create` sub-screen holding the
// same five things the desktop "+ New" group offers. Three things have to hold
// or the screen is unreachable, empty, or offers rows the desktop refuses:
//
//   1. the create slot exists and the row that reaches it points at the mode
//   2. its rows carry the SAME services the topbar's group carries, since
//      Desk.onUiEvent is what handles them
//   3. the current-workspace write privilege drops the four file rows, exactly
//      as it does in the topbar
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  render,
  find,
  findAll,
  servicesIn,
  labelsIn,
} = require("./helpers/render-desk-sidebar");

const S = "desk-module-sidebar";
// `_e.upload` — the harness's _e proxy echoes keys back as their own name.
const _e_upload = "upload";
const CREATE_SERVICES = [
  "new-workspace",
  "new-note",
  "new-document",
  "new-spreadsheet",
  "new-presentation",
];

test("the drawer renders a create slot alongside nav and actions", () => {
  const tree = render();
  for (const slot of ["nav-slot", "actions-slot", "create-slot"]) {
    assert.ok(find(tree, `${S}__${slot}`), `${slot} is rendered on mobile`);
  }
});

test('the "Add new" row leads to the create mode instead of creating a workspace', () => {
  const tree = render();
  const actions = find(tree, `${S}__actions-slot`);
  const services = servicesIn(actions);
  assert.ok(
    services.includes("mobile-show-create"),
    'the actions list offers "mobile-show-create"',
  );
  // The whole point of the change: it used to fire this directly, offering one
  // of the five options and hiding the other four.
  assert.ok(
    !services.includes("new-workspace"),
    "the actions list no longer creates a workspace directly",
  );
});

test("the create screen carries every service the topbar group carries", () => {
  const slot = find(render(), `${S}__create-slot`);
  const services = servicesIn(slot);
  for (const s of CREATE_SERVICES) {
    assert.ok(services.includes(s), `the create screen offers "${s}"`);
  }
  // Order matters: Workspace leads on every surface.
  assert.deepEqual(
    services.filter((s) => CREATE_SERVICES.includes(s)),
    CREATE_SERVICES,
  );
});

test("the create screen's header goes back to the actions list", () => {
  const slot = find(render(), `${S}__create-slot`);
  const back = find(slot, `${S}__logo-back-btn`);
  assert.ok(back, "the sub-screen renders a back button");
  assert.equal(back.service, "mobile-show-add");
  const title = find(slot, `${S}__logo-title`);
  assert.ok(title, "the sub-screen renders a title in the wordmark's place");
  assert.equal(title.content, "ADD_NEW");
  // The desktop-only pin toggle has no business here, and rendering a second
  // one would register its part twice.
  assert.equal(find(slot, `${S}__logo-pin-btn`), null);
});

test("the nav and actions headers are untouched", () => {
  const tree = render();
  for (const slot of ["nav-slot", "actions-slot"]) {
    const n = find(tree, `${S}__${slot}`);
    assert.ok(find(n, `${S}__logo-pin-btn`), `${slot} keeps its pin toggle`);
    assert.ok(find(n, `${S}__logo-icon`), `${slot} keeps the wordmark`);
    assert.equal(find(n, `${S}__logo-back-btn`), null, `${slot} has no back arrow`);
  }
});

test("a viewer without write in the current workspace is offered Workspace alone", () => {
  const slot = find(
    render({ _curWorkspaceCanWrite: () => false }),
    `${S}__create-slot`,
  );
  const services = servicesIn(slot).filter((s) => CREATE_SERVICES.includes(s));
  assert.deepEqual(
    services,
    ["new-workspace"],
    "creating a workspace is account-level and stays; the file rows go",
  );
});

test("the office rows carry the template filename Wm.newDocument reads back", () => {
  const slot = find(render(), `${S}__create-slot`);
  const byService = {};
  for (const n of findAll(slot, `${S}__item`)) byService[n.service] = n;
  assert.equal(byService["new-document"].name, "document.docx");
  assert.equal(byService["new-spreadsheet"].name, "spreadsheet.xlsx");
  assert.equal(byService["new-presentation"].name, "presentation.pptx");
  // A row with no template must not send a blank one.
  assert.equal(byService["new-workspace"].name, undefined);
});

test('the "Add new" row is marked as leading somewhere', () => {
  const tree = render();
  const row = findAll(find(tree, `${S}__actions-slot`), `${S}__item`).find(
    (n) => n.service === "mobile-show-create",
  );
  assert.ok(row, "the row is a sidebar item");
  assert.ok(
    find(row, `${S}__item-affordance`),
    "it carries a trailing arrow, so it does not read as an action",
  );
  assert.deepEqual(labelsIn(row), ["ADD_NEW"]);
});

// ---- The Google Drive import row -------------------------------------------
// It is the topbar dropdown's --gdrive row brought into the drawer. Same
// service, same privilege question; only the position is the drawer's own.
test("the actions list offers the Drive import right after Add new", () => {
  const rows = findAll(find(render(), `${S}__actions-slot`), `${S}__item`);
  const services = rows.map((r) => r.service);
  assert.deepEqual(
    services,
    ["mobile-show-create", "launch-gdrive-migration", _e_upload, "open-mobile-search", "invite-member"],
    "Drive sits between Add new and Upload",
  );
});

test("the Drive row carries its BEM hook and the topbar's label", () => {
  const row = findAll(find(render(), `${S}__actions-slot`), `${S}__item`).find(
    (r) => r.service === "launch-gdrive-migration",
  );
  assert.ok(row, "the row is a sidebar item");
  assert.ok(
    row.className.split(/\s+/).includes(`${S}__item--gdrive`),
    "it is reachable on its own, like the topbar's --gdrive",
  );
  assert.deepEqual(labelsIn(row), ["MIGRATE_GDRIVE_TITLE"]);
});

test("a viewer without write in the current workspace is offered no Drive import", () => {
  // The import lands on the upload path, so it follows the same privilege the
  // topbar's copy follows — `locked` alone would let it through.
  const actions = find(
    render({ _curWorkspaceCanWrite: () => false }),
    `${S}__actions-slot`,
  );
  assert.ok(!servicesIn(actions).includes("launch-gdrive-migration"));
  // The rows that do NOT depend on it must survive.
  assert.ok(servicesIn(actions).includes("mobile-show-create"));
  assert.ok(servicesIn(actions).includes("open-mobile-search"));
});

test("an over-limit org is offered no Drive import", () => {
  const actions = find(render({}, { locked: true }), `${S}__actions-slot`);
  assert.ok(!servicesIn(actions).includes("launch-gdrive-migration"));
});

test("an over-limit org cannot reach the create screen", () => {
  const tree = render({}, { locked: true });
  const actions = find(tree, `${S}__actions-slot`);
  assert.ok(
    !servicesIn(actions).includes("mobile-show-create"),
    'the "Add new" row is absent while locked, so the screen is unreachable',
  );
});
