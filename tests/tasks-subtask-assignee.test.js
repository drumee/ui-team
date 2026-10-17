// tests/tasks-subtask-assignee.test.js — the child creator card's assignee
// picker, in the detail panel ("subtask") and the create modal
// ("create-subtask").
//
//   node --test tests/tasks-subtask-assignee.test.js
//
// Runs the REAL panel methods, sliced out of index.js, against a stub `this`.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { sliceFunction } = require("./helpers/slice-method");

const DIR = path.join(__dirname, "../src/drumee/builtins/window/tasks");
const SRC = fs.readFileSync(path.join(DIR, "index.js"), "utf8");
const SKEL = fs.readFileSync(path.join(DIR, "skeleton/index.js"), "utf8");
const method = (sig, ...deps) =>
  new Function(...deps, `return ${sliceFunction(SRC, sig)}`);

const pickerService = method("pickerService(scope)")();
const pickerDraft = method("_pickerDraft(scope)")();
const toggleAssignee = method("_toggleAssignee(current, uid)")();
const applyAssigneeChange = method("_applyAssigneeChange(kind, assignees, picked = false)")();

function panel(extra = {}) {
  const fed = [];
  const filtered = [];
  return {
    el: {},
    fed,
    filtered,
    pickerService,
    _assigneeScopeService: pickerService,
    _pickerDraft: pickerDraft,
    _toggleAssignee: toggleAssignee,
    // The feed itself needs ./skeleton (webpack-only); the part name is the
    // scope wiring under test.
    _withPart: (name) => (fed.push([name]), Promise.resolve(null)),
    _assigneeSearchInput: () => null,
    _filterAssignees: (scope, q, opt) => filtered.push([scope, opt]),
    _subtaskDraft: { assignees: [] },
    _createSubtaskDraft: { assignees: [] },
    _createDefaults: { assignees: ["parent"] },
    _detailDraft: { assignees: ["detail"] },
    ...extra,
  };
}

test("both new scopes are registered and name their own services", () => {
  const m = SRC.match(/const PICKER_SCOPES = (\[[\s\S]*?\]);/);
  const scopes = new Function(`return ${m[1]}`)();
  assert.ok(scopes.includes("subtask"));
  assert.ok(scopes.includes("create-subtask"));
  assert.equal(pickerService("subtask"), "set-subtask-assignee");
  assert.equal(pickerService("create-subtask"), "set-create-subtask-assignee");
  // The existing pickers are unchanged.
  assert.equal(pickerService("create"), "create-assignee");
  assert.equal(pickerService("detail"), "set-assignee");
  for (const s of ["set-subtask-assignee", "set-create-subtask-assignee"]) {
    assert.ok(SRC.includes(`case "${s}":`), `no onUiEvent case for ${s}`);
  }
});

test("each scope edits its own card's draft — create-subtask is not the parent", () => {
  const p = panel();
  assert.equal(p._pickerDraft("subtask"), p._subtaskDraft);
  assert.equal(p._pickerDraft("create-subtask"), p._createSubtaskDraft);
  assert.equal(p._pickerDraft("create"), p._createDefaults);
  assert.equal(p._pickerDraft("detail"), p._detailDraft);
});

test("a pick repaints the card's own chips part and keeps the list open", () => {
  const p = panel();
  applyAssigneeChange.call(p, "subtask", ["u1"], true);
  applyAssigneeChange.call(p, "create-subtask", [], false);
  applyAssigneeChange.call(p, "create-assignee", [], false);
  assert.deepEqual(
    p.fed.map(([n]) => n),
    ["subtask-assignee-chips", "create-subtask-assignee-chips", "create-assignee-chips"],
  );
  assert.deepEqual(p.filtered, [
    ["subtask", { open: true }],
    ["create-subtask", {}],
    ["create", {}],
  ]);
});

test("the pick case toggles the uid on the card's draft", () => {
  const start = SRC.indexOf('case "set-subtask-assignee":');
  const end = SRC.indexOf("\n      }\n", start);
  const body = SRC.slice(SRC.indexOf("{", start) + 1, end);
  const run = new Function("service", "trigger", body);
  const p = panel();
  const applied = [];
  p._applyAssigneeChange = (...a) => applied.push(a);
  const trig = (uid) => ({ mget: (k) => (k === "memberUid" ? uid : undefined) });
  run.call(p, "set-subtask-assignee", trig("u1"));
  run.call(p, "set-create-subtask-assignee", trig("u2"));
  run.call(p, "set-subtask-assignee", trig("u1"));
  assert.deepEqual(p._subtaskDraft.assignees, []);
  assert.deepEqual(p._createSubtaskDraft.assignees, ["u2"]);
  assert.deepEqual(p._createDefaults.assignees, ["parent"]);
  assert.deepEqual(applied[0], ["subtask", ["u1"], true]);
  assert.deepEqual(applied[2], ["subtask", [], false]);
});

test("the creator drafts start empty, and both commits carry the picks", () => {
  for (const sig of ["_openSubtaskDraft()", "_openCreateSubtaskDraft()"]) {
    assert.match(sliceFunction(SRC, sig), /assignees: \[\],/, sig);
  }
  assert.match(
    sliceFunction(SRC, "async _commitSubtask()"),
    /assignee_uids: Array\.isArray\(draft\.assignees\) \? draft\.assignees : \[\]/,
  );
  // Queued rows keep their own copy; _createQueuedSubtasks already posts them.
  assert.match(
    sliceFunction(SRC, "_queueCreateSubtask()"),
    /assignees: Array\.isArray\(draft\.assignees\) \? draft\.assignees\.slice\(\) : \[\]/,
  );
  assert.match(
    sliceFunction(SRC, "async _createQueuedSubtasks(parentId, queued)"),
    /assignee_uids: Array\.isArray\(sub\.assignees\)/,
  );
});

test("the creator card mounts the picker under its scope", () => {
  assert.match(
    SKEL,
    /className: `\$\{pfx\}__subtask-card-fields`,[\s\S]{0,400}className: `\$\{pfx\}__subtask-card-assignee`,[\s\S]{0,200}assigneePickerField\(\s*ui,\s*draft\.assignees,\s*isCreate \? "create-subtask" : "subtask",/,
  );
});
