// tests/tasks-readonly-member.test.js — a View/Chat member and the Task tab.
//
//   node --test tests/tasks-readonly-member.test.js
//
// Thomas (2026-10-12): a member demoted Edit → Chat edited a task card; Update
// saved nothing and stacked "network error" over the permission popup.
// Natrix (2026-10-13): the card stays editable — it is Update (or any click
// that writes at once) that is refused, with ONE popup, and the stored task is
// left as it was. The panel follows a live role change both ways. Runs the
// REAL panel methods, sliced out of index.js, against a stub `this`.
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

const isTaskEditClick = new Function("ROW_SCOPE", "_e",
  `return ${sliceFunction(SRC, "_isTaskEditClick(service, trigger)")}`,
)(/^comment-row:(.+)$/, { upload: "upload" });

function makePanel(mayWrite, extra = {}) {
  const said = [];
  const p = {
    constructor: { TASK_EDIT_SERVICES: editServices() },
    _isTaskEditClick: isTaskEditClick,
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

test("editing the card's draft is not refused (Natrix: only Update is)", () => {
  const set = editServices();
  for (const s of [
    "set-status", "set-priority", "set-assignee", "set-reporter",
    "reset-reporter", "toggle-assignee-list", "toggle-task-label",
    "toggle-duration", "commit-description", "commit-due-date",
    "add-subtask", "toggle-subtask-menu", "set-subtask-priority",
    "set-subtask-status", "link-search-result",
    "pick-attachment", "remove-pending-file", "file-search-input",
  ]) {
    assert.ok(!set.has(s), `${s} must not be refused`);
  }
});

test("Chat member: a status pill click lands in the draft, no popup", async () => {
  const draft = { status: "todo" };
  const p = makePanel(false, { _detailDraft: draft, _updateStatusPills() {} });
  await onUiEvent.call(p, trig("set-status", { taskStatus: "done" }));
  assert.equal(p.said.length, 0);
  assert.equal(draft.status, "done");
});

test("clicks that write at once are still refused", () => {
  const set = editServices();
  for (const s of [
    "commit-detail", "commit-task", "remove-task", "toggle-complete",
    "create-subtask", "toggle-subtask-complete", "unlink-attachment", "comment-submit", "comment-delete",
  ]) {
    assert.ok(set.has(s), `${s} must be refused`);
  }
});

test("a card paperclip queues a file (allowed); a comment-row paperclip uploads at once (refused)", () => {
  const p = makePanel(false);
  assert.equal(p._isTaskEditClick("pick-attachment", trig("pick-attachment", { searchScope: "detail" })), false);
  assert.equal(p._isTaskEditClick("pick-attachment", trig("pick-attachment", { searchScope: "comment" })), false);
  assert.equal(p._isTaskEditClick("pick-attachment", trig("pick-attachment", { searchScope: "comment-row:42" })), true);
  assert.equal(p._isTaskEditClick("upload", trig("upload", { searchScope: "comment-row:42" })), true);
  assert.equal(p._isTaskEditClick("open-detail", trig("open-detail")), false);
  assert.equal(p._isTaskEditClick("commit-detail", trig("commit-detail")), true);
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

test("demoted: the board redraws; an open card and create form keep their drafts", () => {
  const p = live(false, { _creating: true, _detailId: 5, _detailReturnTo: 2 });
  onMayWriteChanged.call(p);
  assert.deepEqual(p.log, ["render"]);
  assert.equal(p._creating, true);
  assert.equal(p._detailReturnTo, 2);
});

test("promoted: the drag wiring is installed and the board redraws", () => {
  const p = live(true);
  onMayWriteChanged.call(p);
  assert.deepEqual(p.log, ["dnd", "render"]);
});

test("a destroyed panel ignores the change", () => {
  const p = live(false, { isDestroyed: () => true });
  onMayWriteChanged.call(p);
  assert.deepEqual(p.log, []);
});

test("the panel listens for the folder window's may_write flip", () => {
  assert.match(SRC, /listenTo\(this\.model, "change:may_write", this\._onMayWriteChanged\)/);
});

// ── the card is the same for every role ─────────────────────────────────────
test("the card always offers Update, the composer and the file picker", () => {
  assert.doesNotMatch(SKEL, /readOnly/);
  assert.match(SKEL, /\n        Skeletons\.Note\(\{\s*className: `\$\{pfx\}__detail-submit`/);
  assert.match(SKEL, /\n        Skeletons\.Box\.X\(\{\s*className: `\$\{pfx\}__comment-composer`/);
  assert.match(SKEL, /\n        filePickerBlock\("detail"/);
});

test("the description editor is always editable", () => {
  const start = SKEL.indexOf("\nfunction mentionField(");
  const end = SKEL.indexOf("\n}\n", start);
  const rec = (type) => (o) => ({ type, ...o });
  const mentionField = new Function("Skeletons", "LOCALE", "mentionDropdown", "linkPrompt",
    `${SKEL.slice(start, end + 2)}\nreturn mentionField;`)(
    { Box: { Y: rec("Box.Y") }, Element: rec("Element") }, {}, () => null, () => null);
  const ui = { fig: { family: "tasks-panel" } };
  assert.equal(mentionField(ui, "detail").kids[0].attrOpt.contenteditable, "true");
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

// ── the dates are pickable by every member ──────────────────────────────────
test("the due date picker is never locked; the pick only reaches the draft", () => {
  const start = SKEL.indexOf("\nfunction buildDueSectionContent(");
  const body = SKEL.slice(start, SKEL.indexOf("\n}\n", start));
  assert.doesNotMatch(body, /clickOpens|due-date-locked|due-lock|locked/);
  assert.match(body, /service: "task-input-changed"/);
  assert.ok(!SRC.includes('case "due-date-locked"'));
});
