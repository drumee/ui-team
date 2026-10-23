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

test("a child row opens that subtask's own detail", () => {
  const s = subtaskStrip(stubUi({ done: 0, total: 2, open: true, children: kids }), parent, {
    pfx,
    surface: "board",
  });
  const rows = byClass(s, `${pfx}__substrip-row`);
  assert.deepEqual(
    rows.map((r) => [r.service, r.taskId]),
    [
      ["open-detail", "c1"],
      ["open-detail", "c2"],
    ],
  );
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

// ── Wiring (source text: the view skeletons only load under webpack) ────────

const SKEL = fs.readFileSync(path.join(DIR, "skeleton/index.js"), "utf8");
const CAL = fs.readFileSync(path.join(DIR, "skeleton/calendar.js"), "utf8");
// A closure const `const <name> = (...) => {` up to its closing `  };`.
function arrowBody(src, name) {
  const start = src.indexOf(`const ${name} = (`);
  assert.ok(start >= 0, `${name} not found`);
  const end = src.indexOf("\n  };\n", start);
  return src.slice(start, end);
}

test("board card uses the strip, not the meta badge", () => {
  const body = arrowBody(SKEL, "taskCard");
  assert.match(body, /subtaskStrip\(ui, task, \{ pfx, surface: "board" \}\)/);
  assert.doesNotMatch(body, /__task-subcount/);
});

test("calendar week card and month chip both carry the strip", () => {
  for (const name of ["compactChip", "card"]) {
    const body = arrowBody(CAL, name);
    assert.match(body, /subtaskStrip\(ui, t, \{ pfx, surface: "cal" \}\)/, name);
  }
  assert.doesNotMatch(CAL, /__cal-card-subcount/);
});

// A month cell grows with its chips up to 2× its 190px floor (380px: a 326px
// body), then scrolls; "+N" counts what that tallest cell cannot show. A chip
// is 52.4px (80.4px with a Subtasks strip) on a 10px gap; with a "+N" the last
// chip must end above its 18px pin (308px).
test("month cell fit is measured against the 2× cell", () => {
  const { monthFit } = require(path.join(DIR, "skeleton/calendar.js"));
  const ui = {
    isSubtask: () => false,
    getSubtaskCount: (t) => ({ done: 0, total: t.n || 0 }),
  };
  const plain = (k) => Array.from({ length: k }, () => ({ n: 0 }));
  const strip = (k) => Array.from({ length: k }, () => ({ n: 2 }));
  assert.equal(monthFit(ui, plain(3)), 3); // 177px: all visible, no "+N"
  assert.equal(monthFit(ui, plain(6)), 5); // 364px > 326: 5 end at 302 ≤ 308
  assert.equal(monthFit(ui, strip(4)), 3); // 352px > 326: 3 end at 261, 4th at 352
  assert.equal(monthFit(ui, [...strip(1), ...plain(5)]), 4); // 80+4×62 = 330 > 308
});

// ── Gantt child row + subtask detail breadcrumb ─────────────────────────────

const GANTT = fs.readFileSync(path.join(DIR, "skeleton/gantt.js"), "utf8");

test("gantt child row carries the stack glyph before its title", () => {
  const start = GANTT.indexOf("className: `${pfx}__gantt-arow`");
  const body = GANTT.slice(start, GANTT.indexOf("className: `${pfx}__gantt-title`", start));
  assert.match(body, /child\s*\?\s*Skeletons\.Image\.Svg\(\{\s*className: `\$\{pfx\}__gantt-subico`,\s*ico: "ph-stack-simple"/);
});

test("subtask detail breadcrumb reads 'Parent / child', the parent is the link", () => {
  const start = SKEL.indexOf("const parentCrumb = parentTask");
  const body = SKEL.slice(start, SKEL.indexOf("const header = ", start));
  assert.match(body, /__detail-parent-title`,[\s\S]*?service: "open-detail"[\s\S]*?taskId: parentTask\.id/);
  assert.match(body, /__detail-parent-sep`,\s*content: "\/"/);
  assert.match(body, /__detail-parent-current`,\s*content: detail\.title/);
  assert.doesNotMatch(body, /caret-left/);
});

// ── Final-review fixes (skin) ───────────────────────────────────────────────

const SCSS = fs.readFileSync(path.join(DIR, "skin/index.scss"), "utf8");
const rule = (sel) => {
  const i = SCSS.indexOf(`${sel} {`);
  assert.ok(i >= 0, `${sel} missing`);
  return SCSS.slice(i, SCSS.indexOf("\n  }\n", i));
};

test("calendar strip pill can shrink and ellipsise ('In progress' in a 163px card)", () => {
  const pill = rule('&__substrip[data-surface="cal"] &__substrip-status');
  assert.match(pill, /flex: 0 1 auto;/);
  assert.match(pill, /min-width: 0;/);
  const label = rule('&__substrip[data-surface="cal"] &__substrip-status-label');
  assert.match(label, /overflow: hidden;/);
  assert.match(label, /text-overflow: ellipsis;/);
  // The NAME gives way first (Figma "S…"), whatever its length; the dot never.
  assert.match(rule('&__substrip[data-surface="cal"] &__substrip-name'), /flex: 1 1 0;/);
  assert.match(rule("&__substrip-status-dot"), /flex: 0 0 6px;/);
});

test("list stack glyph and creator text follow the theme (no fixed near-black)", () => {
  assert.doesNotMatch(rule("&__list-subico"), /#0b0a21;/);
  assert.match(rule("&__list-subico"), /var\(--normal-fg-10, #0b0a21\)/);
  assert.match(rule("&__list-subcreate"), /\$color: var\(--normal-fg-10, #0b0a21\)/);
});

test("strip items use the compact scale (32px rows, 22px pill, 20px avatar)", () => {
  assert.match(rule("&__substrip-row"), /min-height: 32px;/);
  assert.match(rule("&__substrip-name"), /\$size: 12px/);
  assert.match(rule("&__substrip-status"), /height: 22px;/);
  assert.match(rule("&__substrip-status-label"), /\$size: 11px/);
  assert.match(SCSS, /&__substrip-avatar,\n  &__substrip-noassignee \{\n    flex: 0 0 auto;\n    width: 20px;\n    height: 20px;/);
  assert.match(SCSS, /&__substrip-ico,\n  &__substrip-caret \{\n    flex: 0 0 auto;\n    width: 14px;\n    height: 14px;/);
});

test("gantt aside items use the compact scale", () => {
  assert.match(rule("&__gantt-title"), /\$size: 12px/);
  assert.match(rule('&__gantt-arow[data-child="1"] &__gantt-title'), /\$size: 11px/);
  assert.match(rule("&__gantt-check"), /width: 14px;/);
  assert.match(rule("&__gantt-dot"), /width: 6px;/);
  assert.match(rule("&__gantt-subico"), /width: 14px;/);
  assert.match(rule("&__gantt-del"), /width: 14px;/);
  assert.match(rule("&__gantt-add-child"), /width: 14px;/);
  assert.match(rule("&__gantt-work-label"), /\$size: 12px/);
  assert.match(rule("&__gantt-del-sel"), /\$size: 12px/);
  assert.match(rule("&__gantt-arow"), /padding: 0 12px;/);
});

test("month cell grows to 2× its floor, then scrolls with no visible scrollbar", () => {
  assert.match(rule('&__calendar[data-mode="month"] &__cal-week-row'), /flex: 1 0 auto;/);
  assert.match(rule('&__calendar[data-mode="month"] &__cal-week-row'), /max-height: calc\(2 \* var\(--tcal-cell-min\)\);/);
  assert.match(rule('&__calendar[data-mode="month"] &__cal-day'), /max-height: calc\(2 \* var\(--tcal-cell-min\)\);/);
  const body = rule("&__cal-day-body");
  assert.match(body, /overflow-y: auto;/);
  assert.match(body, /scrollbar-width: none;/);
  assert.match(body, /&::-webkit-scrollbar \{\s*display: none;/);
  assert.doesNotMatch(body, /scrollbar-color/);
});
