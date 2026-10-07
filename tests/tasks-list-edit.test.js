const test = require("node:test");
const assert = require("node:assert/strict");
const {
  TITLE_MAX,
  titleTooLong,
  fieldPatch,
  toggleUid,
  parseDateInput,
  formatDateInput,
  monthGrid,
  shiftMonth,
  describePeerChange,
} = require("../src/drumee/builtins/window/tasks/list-edit");

const task = {
  id: "t1",
  title: "Prepare Q3 report",
  description: "Summarize",
  priority: "medium",
  status: "todo",
  due_date: "2026-06-13",
  start_date: "2026-06-10",
  reporter_uid: "u1",
  assignee_uids: ["u1", "u2"],
};

test("an unchanged value sends nothing", () => {
  assert.equal(fieldPatch(task, "title", "  Prepare Q3 report "), null);
  assert.equal(fieldPatch(task, "priority", "medium"), null);
  assert.equal(fieldPatch(task, "status", "todo"), null);
  assert.equal(fieldPatch(task, "assignees", ["u2", "u1"]), null);
  assert.equal(fieldPatch(task, "reporter", "u1"), null);
  assert.equal(fieldPatch(task, "due_date", "2026-06-13"), null);
});

test("an empty title is refused", () => {
  assert.deepEqual(fieldPatch(task, "title", "   "), { error: "empty" });
});

test("a title over TITLE_MAX characters is refused; exactly the limit is sent", () => {
  assert.equal(TITLE_MAX, 250);
  assert.deepEqual(fieldPatch(task, "title", "a".repeat(251)), { error: "too-long" });
  assert.equal(fieldPatch(task, "title", "a".repeat(250)).args.title, "a".repeat(250));
});

test("the limit counts characters, ignores edge spaces", () => {
  // 250 emoji are 500 UTF-16 units but 250 characters — the varchar's unit.
  assert.equal(titleTooLong("😀".repeat(250)), false);
  assert.equal(titleTooLong("😀".repeat(251)), true);
  assert.equal(titleTooLong(`  ${"a".repeat(250)}  `), false);
  assert.equal(titleTooLong(""), false);
});

test("task.update always carries both current dates", () => {
  const p = fieldPatch(task, "priority", "high");
  assert.equal(p.service, "task.update");
  assert.deepEqual(p.args, { priority: "high", due_date: "2026-06-13", start_date: "2026-06-10" });
  assert.deepEqual(p.local, { priority: "high" });
  const t = fieldPatch(task, "title", "New");
  assert.deepEqual(t.args, { title: "New", due_date: "2026-06-13", start_date: "2026-06-10" });
});

test("status and assignees use their own services", () => {
  assert.equal(fieldPatch(task, "status", "done").service, "task.update_status");
  const a = fieldPatch(task, "assignees", ["u1"]);
  assert.equal(a.service, "task.update_assignee");
  assert.deepEqual(a.args, { assignee_uids: ["u1"] });
});

test("date edits keep the range ordered", () => {
  // Start past the due date drags the due date along (and collapses to one day).
  assert.deepEqual(fieldPatch(task, "start_date", "2026-06-20").args, {
    due_date: "2026-06-20",
    start_date: null,
  });
  // Due before the start pulls the start in.
  assert.deepEqual(fieldPatch(task, "due_date", "2026-06-05").args, {
    due_date: "2026-06-05",
    start_date: null,
  });
  // Clearing the due date keeps the start.
  assert.deepEqual(fieldPatch(task, "due_date", "").args, {
    due_date: null,
    start_date: "2026-06-10",
  });
});

test("toggleUid adds and removes", () => {
  assert.deepEqual(toggleUid(["a"], "b"), ["a", "b"]);
  assert.deepEqual(toggleUid(["a", "b"], "a"), ["b"]);
});

test("dd/mm/yyyy round-trips and rejects impossible days", () => {
  assert.equal(parseDateInput("10/06/2026"), "2026-06-10");
  assert.equal(parseDateInput("1/6/2026"), "2026-06-01");
  assert.equal(parseDateInput("31/02/2026"), "");
  assert.equal(parseDateInput("junk"), "");
  assert.equal(formatDateInput("2026-06-10"), "10/06/2026");
  assert.equal(formatDateInput(""), "");
});

test("monthGrid starts on Sunday and pads whole weeks", () => {
  const weeks = monthGrid("2026-06"); // 1 June 2026 is a Monday
  assert.equal(weeks[0][0], null);
  assert.equal(weeks[0][1], "2026-06-01");
  assert.ok(weeks.every((w) => w.length === 7));
  assert.equal(weeks.flat().filter(Boolean).length, 30);
  assert.equal(shiftMonth("2026-12", 1), "2027-01");
  assert.equal(shiftMonth("2026-01", -1), "2025-12");
});

test("describePeerChange words each field the Figma way", () => {
  const ctx = {
    t: {
      renamed: 'changed "{from}" to "{to}"',
      priority: 'updated priority to "{value}" on "{task}"',
      status: 'updated status to "{value}" on "{task}"',
      due: 'updated the due date for "{task}"',
      assigned: 'assigned {n} members to "{task}"',
      assignedOne: 'assigned 1 member to "{task}"',
      files: 'linked files to "{task}"',
    },
    priorityName: (k) => k.toUpperCase(),
    statusName: (k) => `S:${k}`,
  };
  assert.equal(
    describePeerChange("task.update", task, { id: "t1", title: "Renamed" }, ctx),
    'changed "Prepare Q3 report" to "Renamed"',
  );
  assert.equal(
    describePeerChange("task.update", task, { id: "t1", title: task.title, priority: "high" }, ctx),
    'updated priority to "HIGH" on "Prepare Q3 report"',
  );
  assert.equal(
    describePeerChange("task.update", task, { ...task, due_date: "2026-06-20T00:00:00" }, ctx),
    'updated the due date for "Prepare Q3 report"',
  );
  assert.equal(
    describePeerChange("task.update_status", task, { id: "t1", status: "done" }, ctx),
    'updated status to "S:done" on "Prepare Q3 report"',
  );
  assert.equal(
    describePeerChange("task.update_assignee", task, { id: "t1", assignee_uids: ["u1", "u2", "u3", "u4"] }, ctx),
    'assigned 2 members to "Prepare Q3 report"',
  );
  assert.equal(describePeerChange("task.link_file", task, { id: "t1" }, ctx), 'linked files to "Prepare Q3 report"');
  // A full row that changed nothing the list shows raises no toast.
  assert.equal(describePeerChange("task.update", task, { ...task }, ctx), "");
});

test("a reporter that only resolves to the creator is not a change", () => {
  const ctx = { t: { reporter: 'changed the reporter of "{task}"' }, priorityName: String, statusName: String };
  const legacy = { id: "t", title: "T", created_by: "u1", reporter_uid: null };
  assert.equal(describePeerChange("task.update", legacy, { ...legacy, reporter_uid: "u1" }, ctx), "");
  assert.equal(
    describePeerChange("task.update", legacy, { ...legacy, reporter_uid: "u2" }, ctx),
    'changed the reporter of "T"',
  );
});
