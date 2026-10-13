// tests/tasks-readonly-member.test.js — a View/Chat member and the Task tab.
//
//   node --test tests/tasks-readonly-member.test.js
//
// Thomas (2026-10-12): a member demoted Edit → Chat could still edit a task
// card; Update saved nothing and stacked "network error" over the permission
// popup. The edit has to stop at the click, with ONE popup, and the panel has
// to follow a live role change both ways. Runs the REAL panel methods, sliced
// out of index.js, against a stub `this`.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { sliceFunction } = require("./helpers/slice-method");

const DIR = path.join(__dirname, "../src/drumee/builtins/window/tasks");
const SRC = fs.readFileSync(path.join(DIR, "index.js"), "utf8");
const SKEL = fs.readFileSync(path.join(DIR, "skeleton/index.js"), "utf8");

// The static getter's array, evaluated as written.
function editServices() {
  const m = SRC.match(/static get TASK_EDIT_SERVICES\(\) \{\s*return new Set\((\[[\s\S]*?\])\);/);
  assert.ok(m, "TASK_EDIT_SERVICES not found");
  return new Set(new Function(`return ${m[1]}`)());
}

function makePanel(mayWrite, extra = {}) {
  const said = [];
  const p = {
    constructor: { TASK_EDIT_SERVICES: editServices() },
    _mayWriteTasks: () => (typeof mayWrite === "function" ? mayWrite() : mayWrite),
    _sayCannotEditTasks: () => said.push(1),
    _refuseWhileRowBusy: () => false,
    said,
    ...extra,
  };
  return p;
}

// The method calls super.onUiEvent, so it is evaluated as a class member.
function rawMethod(signature) {
  const start = SRC.indexOf(`\n  ${signature} {`);
  assert.ok(start > -1, `${signature} not found`);
  const end = SRC.indexOf("\n  }\n", start);
  return SRC.slice(start, end + 4);
}
const onUiEvent = new Function(
  "listInline", "_a", "Visitor",
  `class Base { onUiEvent() {} }
   return class extends Base { ${rawMethod("async onUiEvent(trigger, args = {})")} }.prototype.onUiEvent;`,
)({ LIST_SERVICES: new Set() }, { service: "service" }, { id: "me" });

const trig = (service, fields = {}) => ({
  get: (k) => (k === "service" ? service : undefined),
  mget: (k) => fields[k],
});

test("every refused service is a real onUiEvent case (no typo can leave a hole)", () => {
  for (const s of editServices()) {
    assert.ok(SRC.includes(`case "${s}":`), `no case for ${s}`);
  }
});

test("reading stays open to a View/Chat member", () => {
  const set = editServices();
  for (const s of [
    "open-detail", "close-detail", "cancel-detail", "activity-tab",
    "open-attachment", "toggle-subtasks", "col-watch-toggle", "set-view",
    "filter-set", "filter-clear", "toggle-filter", "cancel-add",
  ]) {
    assert.ok(!set.has(s), `${s} must not be refused`);
  }
});

test("Chat member: a status pill click is refused once, the draft is untouched", async () => {
  const draft = { status: "todo" };
  const p = makePanel(false, { _detailDraft: draft });
  await onUiEvent.call(p, trig("set-status", { taskStatus: "done" }));
  assert.equal(p.said.length, 1);
  assert.equal(draft.status, "todo");
});

test("Chat member: Update never reaches _commitDetail", async () => {
  let committed = 0;
  const p = makePanel(false, { _commitDetail: async () => { committed++; } });
  await onUiEvent.call(p, trig("commit-detail"));
  assert.equal(committed, 0);
  assert.equal(p.said.length, 1);
});

test("Chat member can still open a card", async () => {
  const opened = [];
  const p = makePanel(false, { _openDetail: (id) => opened.push(id) });
  await onUiEvent.call(p, trig("open-detail", { taskId: 7 }));
  assert.deepEqual(opened, [7]);
  assert.equal(p.said.length, 0);
});

test("Editor: the same click goes through", async () => {
  const draft = { status: "todo" };
  const p = makePanel(true, {
    _detailDraft: draft,
    _creating: false,
    el: { querySelector: () => null },
    _updateStatusPills() {},
    _syncDetailDirty() {},
  });
  await onUiEvent.call(p, trig("set-status", { taskStatus: "done" })).catch(() => {});
  assert.equal(p.said.length, 0);
  assert.equal(draft.status, "done");
});

test("the gate reads the role at click time, not at render", async () => {
  let may = true;
  const p = makePanel(() => may, { _commitDetail: async () => {} });
  may = false;
  await onUiEvent.call(p, trig("commit-detail"));
  assert.equal(p.said.length, 1);
});

// ── the popup ───────────────────────────────────────────────────────────────
function sayer(recent) {
  const calls = [];
  const PD = {
    saidRecently: () => recent,
    sayWeakPrivilege: (...a) => calls.push(a),
    workspacePrivilege: () => 7,
  };
  const fn = new Function("require", "LOCALE", "_a", "_K",
    `return ${sliceFunction(SRC, "_sayCannotEditTasks()")}`)(
    (m) => (m === "libs/permission-denied" ? PD : null),
    { PERMISSION_ACTION_EDIT_TASKS: "edit tasks" },
    { hub_id: "hub_id" },
    { permission: { write: 8 } },
  );
  return { fn, calls };
}

test("the refusal names the member's level and the write right", () => {
  const { fn, calls } = sayer(false);
  fn.call({ mget: () => "h1" });
  assert.deepEqual(calls, [["edit tasks", 7, 8]]);
});

test("one popup only: a refusal said a moment ago is not repeated", () => {
  const { fn, calls } = sayer(true);
  fn.call({ mget: () => "h1" });
  assert.equal(calls.length, 0);
});

test("the postService guard and onUiEvent share the one popup", () => {
  const guard = sliceFunction(SRC, "_guardTaskWrites()");
  assert.ok(guard.includes("this._sayCannotEditTasks()"));
  assert.ok(!guard.includes("sayWeakPrivilege("), "guard must not build its own popup");
});

// ── live role change ────────────────────────────────────────────────────────
const onMayWriteChanged = new Function(
  `return ${sliceFunction(SRC, "_onMayWriteChanged()")}`,
)();

function live(mayWrite, extra = {}) {
  const log = [];
  return {
    log,
    el: {},
    isDestroyed: () => false,
    _mayWriteTasks: () => mayWrite,
    _installDnd: () => log.push("dnd"),
    _discardCreateForm() { log.push("discard"); this._creating = false; },
    _openDetail(id) { log.push(`open:${id}`); this._detailReturnTo = null; },
    _render: () => log.push("render"),
    _tasks: [{ id: 5 }],
    ...extra,
  };
}

test("demoted: the create form closes, the open card re-seeds, the board redraws", () => {
  const p = live(false, { _creating: true, _detailId: 5, _detailReturnTo: 2 });
  onMayWriteChanged.call(p);
  assert.deepEqual(p.log, ["discard", "open:5", "render"]);
  assert.equal(p._detailReturnTo, 2, "the way back to the parent survives");
});

test("promoted: the drag wiring is installed and the board redraws", () => {
  const p = live(true);
  onMayWriteChanged.call(p);
  assert.deepEqual(p.log, ["dnd", "render"]);
});

test("a card whose task is gone is not re-opened", () => {
  const p = live(false, { _detailId: 99 });
  onMayWriteChanged.call(p);
  assert.deepEqual(p.log, ["render"]);
});

test("a destroyed panel ignores the change", () => {
  const p = live(false, { isDestroyed: () => true });
  onMayWriteChanged.call(p);
  assert.deepEqual(p.log, []);
});

test("the panel listens for the folder window's may_write flip", () => {
  assert.match(SRC, /listenTo\(this\.model, "change:may_write", this\._onMayWriteChanged\)/);
});

// ── the read-only card ──────────────────────────────────────────────────────
test("the description editor is not editable when read-only", () => {
  const start = SKEL.indexOf("\nfunction mentionField(");
  const end = SKEL.indexOf("\n}\n", start);
  const nodes = [];
  const rec = (type) => (o) => (nodes.push({ type, ...o }), { type, ...o });
  const mentionField = new Function("Skeletons", "LOCALE", "mentionDropdown", "linkPrompt",
    `${SKEL.slice(start, end + 2)}\nreturn mentionField;`)(
    { Box: { Y: rec("Box.Y") }, Element: rec("Element") }, {}, () => null, () => null);
  const ui = { fig: { family: "tasks-panel" } };
  const editor = (opt) => mentionField(ui, "detail", opt).kids[0].attrOpt.contenteditable;
  assert.equal(editor({ readonly: true }), "false");
  assert.equal(editor({ readonly: false }), "true");
  assert.equal(editor(undefined), "true", "every other caller stays editable");
});

test("the read-only card drops Update, the composer and the file picker", () => {
  assert.match(SKEL, /const readOnly = !mayCreateTask\(ui\);/);
  assert.match(SKEL, /readOnly \? null : Skeletons\.Note\(\{\s*className: `\$\{pfx\}__detail-submit`/);
  assert.match(SKEL, /readOnly \? null : Skeletons\.Box\.X\(\{\s*className: `\$\{pfx\}__comment-composer`/);
  assert.match(SKEL, /readOnly\s*\? null\s*: filePickerBlock\("detail"/);
  assert.match(SKEL, /\.\.\.\(readOnly \? \{ readonly: 1 \} : \{\}\)/);
});

// ── drag a card / column without write rights (Thomas, round 2) ─────────────
function dragHarness(mayWrite) {
  const fn = new Function(`return ${sliceFunction(SRC, "_installDragRefusal()")}`)();
  const listeners = [];
  const said = [];
  const el = {
    addEventListener: (type, h, capture) => listeners.push({ type, h, capture }),
    contains: () => true,
  };
  const p = {
    el,
    _mayWriteTasks: () => (typeof mayWrite === "function" ? mayWrite() : mayWrite),
    _sayCannotEditTasks: () => said.push(1),
  };
  fn.call(p);
  fn.call(p); // idempotent
  const ev = (match) => {
    const e = { prevented: 0, stopped: 0, preventDefault() { this.prevented++; }, stopPropagation() { this.stopped++; } };
    e.target = { closest: (sel) => (match && sel.includes(match) ? { el: match } : null) };
    return e;
  };
  return { listeners, said, ev };
}

test("Chat member: dragging a card is refused at dragstart, with the popup", () => {
  const { listeners, said, ev } = dragHarness(false);
  assert.equal(listeners.length, 1, "installed once");
  assert.equal(listeners[0].type, "dragstart");
  assert.equal(listeners[0].capture, true, "capture: runs before the board's own dragstart");
  const e = ev(".tasks-panel__task-card");
  listeners[0].h(e);
  assert.equal(e.prevented, 1);
  assert.equal(e.stopped, 1);
  assert.equal(said.length, 1);
});

test("Chat member: dragging a custom column header is refused too", () => {
  const { listeners, said, ev } = dragHarness(false);
  const e = ev("[data-coldrag]");
  listeners[0].h(e);
  assert.equal(e.prevented, 1);
  assert.equal(said.length, 1);
});

test("a drag of anything else in the panel is left alone", () => {
  const { listeners, said, ev } = dragHarness(false);
  const e = ev(null);
  listeners[0].h(e);
  assert.equal(e.prevented, 0);
  assert.equal(said.length, 0);
});

test("Editor (or a member promoted since): the drag goes through untouched", () => {
  let may = false;
  const { listeners, said, ev } = dragHarness(() => may);
  may = true;
  const e = ev(".tasks-panel__task-card");
  listeners[0].h(e);
  assert.equal(e.prevented, 0);
  assert.equal(said.length, 0);
});

test("the refusal is installed for every member, before the write-only wiring", () => {
  const dnd = sliceFunction(SRC, "_installDnd()");
  const refusal = dnd.indexOf("this._installDragRefusal()");
  const gate = dnd.indexOf("if (!this._mayWriteTasks()) return;");
  assert.ok(refusal > -1 && gate > -1 && refusal < gate);
});

// ── the due date on a read-only card ────────────────────────────────────────
test("the due date is locked on a read-only card, and its click is refused", () => {
  const start = SKEL.indexOf("\nfunction buildDueSectionContent(");
  const body = SKEL.slice(start, SKEL.indexOf("\n}\n", start));
  assert.match(body, /const locked = !isCreate && !mayCreateTask\(ui\);/);
  assert.match(body, /if \(locked\) picker\.vendorOpt\.clickOpens = false;/);
  assert.match(body, /service: "due-date-locked", uiHandler: \[ui\], kidsOpt: \{ active: 0 \}/);
  assert.ok(editServices().has("due-date-locked"));
});

test("a click on the locked due date gives the popup and changes nothing", async () => {
  const draft = { due_date: "2026-10-20" };
  const p = makePanel(false, { _detailDraft: draft });
  await onUiEvent.call(p, trig("due-date-locked"));
  assert.equal(p.said.length, 1);
  assert.equal(draft.due_date, "2026-10-20");
});
