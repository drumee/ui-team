// tests/tasks-subtask-strip.test.js — the "Subtasks" strip at the foot of a
// Board card / Calendar card / Calendar month chip (Figma subtask flows,
// section 873:221900): collapsed header, and when expanded a progress bar plus
// one row per child.
//
//   node --test tests/tasks-subtask-strip.test.js
//
// Runs the REAL builder from skeleton/helpers.js against stub Skeletons, and
// checks the Board / Calendar wiring from the skeleton source text (those files
// only load under webpack).
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const DIR = path.join(__dirname, "../src/drumee/builtins/window/tasks");

global.LOCALE = { SUBTASKS: "Subtasks" };
global.Skeletons = {
  Box: {
    X: (o) => ({ t: "X", ...o }),
    Y: (o) => ({ t: "Y", ...o }),
  },
  Note: (o) => ({ t: "Note", ...o }),
  Image: { Svg: (o) => ({ t: "Svg", ...o }) },
  Button: { Svg: (o) => ({ t: "BtnSvg", ...o }) },
  UserProfile: (o) => ({ t: "UserProfile", ...o }),
};
const { subtaskStrip, subtaskProgress } = require(path.join(DIR, "skeleton/helpers.js"));

const pfx = "tasks-panel";
const parent = { id: "p1", title: "Parent" };
const kids = [
  { id: "c1", title: "Child one", status: "todo", parent_task_id: "p1" },
  { id: "c2", title: "Child two", status: "done", parent_task_id: "p1", assignee_uids: ["u1"] },
];

function stubUi({ done = 0, total = 0, open = false, sub = false, children = [] } = {}) {
  return {
    getSubtaskCount: () => ({ done, total }),
    isSubtask: () => sub,
    isSubtasksOpen: () => open,
    getSubtasks: () => children,
    getColumns: () => [
      { key: "todo", name: "To Do", color: "#AEAEB2", theme: "default" },
      { key: "done", name: "Complete", color: "#54B684", theme: "green", is_done: 1 },
    ],
    getKnownAssignees: (t) => t.assignee_uids || [],
    getMember: (uid) => ({ id: uid, firstname: "Ann", lastname: "Lee" }),
  };
}

// Every node in the descriptor tree, depth-first.
function flat(node, out = []) {
  if (!node) return out;
  out.push(node);
  (node.kids || []).forEach((k) => flat(k, out));
  return out;
}
const byClass = (root, cls) => flat(root).filter((n) => (n.className || "").split(" ").includes(cls));

test("progress rounds done/total to a percentage", () => {
  assert.deepEqual(subtaskProgress(stubUi({ done: 1, total: 3 }), parent), { done: 1, total: 3, pct: 33 });
  assert.deepEqual(subtaskProgress(stubUi(), parent), { done: 0, total: 0, pct: 0 });
});

test("strip is null when the task has no subtasks", () => {
  assert.equal(subtaskStrip(stubUi(), parent, { pfx, surface: "board" }), null);
});

test("strip is null on a subtask (one level of nesting)", () => {
  assert.equal(subtaskStrip(stubUi({ total: 2, sub: true }), parent, { pfx, surface: "board" }), null);
});

test("collapsed strip renders the header only", () => {
  const s = subtaskStrip(stubUi({ done: 0, total: 2 }), parent, { pfx, surface: "board" });
  assert.equal(s.className, `${pfx}__substrip`);
  assert.equal(s.dataset.open, "0");
  assert.equal(s.dataset.surface, "board");
  assert.equal(s.kids.length, 1);
  assert.equal(byClass(s, `${pfx}__substrip-count`)[0].content, "0/2");
  assert.equal(byClass(s, `${pfx}__substrip-label`)[0].content, "Subtasks");
});

test("expanded strip has the bar and one row per child", () => {
  const s = subtaskStrip(stubUi({ done: 1, total: 2, open: true, children: kids }), parent, {
    pfx,
    surface: "cal",
  });
  assert.equal(s.dataset.open, "1");
  assert.equal(byClass(s, `${pfx}__substrip-bar`).length, 1);
  assert.equal(byClass(s, `${pfx}__substrip-fill`)[0].styleOpt.width, "50%");
  const rows = byClass(s, `${pfx}__substrip-row`);
  assert.equal(rows.length, 2);
  assert.equal(byClass(rows[0], `${pfx}__substrip-name`)[0].content, "Child one");
  assert.equal(byClass(rows[1], `${pfx}__substrip-status-label`)[0].content, "Complete");
});

test("a child row opens the PARENT's detail", () => {
  const s = subtaskStrip(stubUi({ done: 0, total: 2, open: true, children: kids }), parent, {
    pfx,
    surface: "board",
  });
  for (const row of byClass(s, `${pfx}__substrip-row`)) {
    assert.equal(row.service, "open-detail");
    assert.equal(row.taskId, "p1");
  }
});

test("child row shows the assignee avatar, or a placeholder when unassigned", () => {
  const s = subtaskStrip(stubUi({ done: 0, total: 2, open: true, children: kids }), parent, {
    pfx,
    surface: "board",
  });
  const rows = byClass(s, `${pfx}__substrip-row`);
  assert.equal(flat(rows[0]).filter((n) => n.t === "UserProfile").length, 0);
  assert.equal(byClass(rows[0], `${pfx}__substrip-noassignee`).length, 1);
  assert.equal(flat(rows[1]).filter((n) => n.t === "UserProfile")[0].id, "u1");
});

test("every strip control has bubble 0 (the card is draggable and opens on click)", () => {
  const s = subtaskStrip(stubUi({ done: 0, total: 2, open: true, children: kids }), parent, {
    pfx,
    surface: "board",
  });
  const controls = flat(s).filter((n) => n.service);
  assert.ok(controls.length >= 3);
  for (const c of controls) assert.equal(c.bubble, 0, `${c.className} bubbles`);
  const head = byClass(s, `${pfx}__substrip-head`)[0];
  assert.equal(head.service, "toggle-subtasks");
  assert.equal(head.taskId, "p1");
});

test("complete stamp when every child is done", () => {
  const s = subtaskStrip(stubUi({ done: 2, total: 2 }), parent, { pfx, surface: "board" });
  assert.equal(s.dataset.complete, "1");
  const s2 = subtaskStrip(stubUi({ done: 1, total: 2 }), parent, { pfx, surface: "board" });
  assert.equal(s2.dataset.complete, "0");
});
