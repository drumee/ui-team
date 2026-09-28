// Shared pure render helpers for the List + Summary task views. (The Board
// keeps its own inline copies — left untouched to avoid touching tested code.)
// Globals Dayjs/LOCALE are injected at runtime.

const PRIORITY_RANK = { urgent: 4, high: 3, medium: 2, low: 1 };

// Never falls back to m.id / m.uid: a member the workspace can no longer
// resolve has no name, and printing their raw 16-char uid in a name slot reads
// as a corrupted name instead of as "no longer here".
function fullName(m) {
  if (!m) return "";
  return (
    [m.firstname, m.lastname].filter(Boolean).join(" ").trim() || m.email || ""
  );
}

// Pass `ui` to get only the assignees who are still workspace members — an ex
// member has no profile left to render (see tasks_panel.getKnownAssignees).
function assigneeUids(t, ui) {
  if (ui && typeof ui.getKnownAssignees === "function") {
    return ui.getKnownAssignees(t);
  }
  if (Array.isArray(t.assignee_uids)) return t.assignee_uids;
  return t.assignee_uid ? [t.assignee_uid] : [];
}

function formatDue(d) {
  if (!d) return "";
  try {
    return Dayjs(d).format("MMM D");
  } catch {
    return d;
  }
}

// Due label for a task: a duration task (start_date set and distinct from the
// due date) shows the span "start → due"; a single-day task — no start_date, or
// a start that equals the due date — shows just the one date.
function formatDueRange(t) {
  if (!t) return "";
  const start = t.start_date || "";
  const end = t.due_date || "";
  if (start && end && start !== end) {
    return `${formatDue(start)} → ${formatDue(end)}`;
  }
  return formatDue(end);
}

function isOverdue(d) {
  if (!d) return false;
  try {
    return Dayjs(d).isBefore(Dayjs(), "day");
  } catch {
    return false;
  }
}

function priorityMeta(ui, key) {
  return (
    (ui.getPriorities() || []).find((p) => p.key === key) || {
      key,
      label: "",
      color: "#AEAEB2",
    }
  );
}

function statusMeta(ui, key) {
  return (
    (ui.getColumns() || []).find((c) => c.key === key) || {
      key,
      label: "",
      color: "#AEAEB2",
      // `theme` drives every tinted status pill in the skin — a fallback
      // without it would render `data-theme="undefined"` and match nothing.
      theme: "default",
    }
  );
}

/**
 * May this viewer create tasks / boards here?
 *
 * The tasks panel is a LetcBox with no privilege of its own, so the folder
 * window hands it `may_write` at mount (folder/index.js), derived from the same
 * canUpload() its "+ New" gate uses. task.create / task.column_create are
 * `src: write` server-side, so view and chat members are refused there anyway —
 * this only stops the button being offered.
 *
 * Deliberately `!== false`: an absent or unrecognised value behaves exactly as
 * before, so this can never hide the button from someone whose privilege simply
 * was not passed down.
 */
function mayCreateTask(ui) {
  try {
    return ui.mget("may_write") !== false;
  } catch (e) {
    return true;
  }
}

/**
 * done/total pill for a task that has subtasks — shared by the Board card, the
 * List row and the Calendar chip so all three read identically.
 *
 * Returns null when the task has no subtasks: the spec is explicit that the
 * badge only exists when there is something to count, and rendering an empty
 * "0/0" would be a dead affordance. `data-complete` lets the skin tint the
 * finished state without a second class.
 */
function subtaskBadge(ui, t, cls) {
  const { done, total } = ui.getSubtaskCount(t);
  if (!total) return null;
  return Skeletons.Note({
    className: cls,
    content: `${done}/${total}`,
    attrOpt: { "data-complete": done === total ? "1" : "0" },
  });
}

// ── Filter dimensions ──────────────────────────────────────────
// One table for the popover's pages, their value rows and the applied-filter
// chips, so the three can never disagree about what a dimension is called or
// what its values read as. `keyword` is the search box, not a page.
const FILTER_DIMS = [
  { dim: "priority", ico: "apps-warning", label: "PRIORITY" },
  { dim: "status", ico: "checked-circle", label: "STATUS" },
  { dim: "due", ico: "calendar", label: "DUE_DATE" },
  { dim: "files", ico: "app-attachment", label: "LINKED_FILES" },
  { dim: "assignee", ico: "two-users", label: "ASSIGNEE" },
];

// Fixed value sets, as [value, LOCALE key] — resolved at render time, since
// LOCALE is injected after this module loads.
const FILTER_DUE = [
  ["overdue", "OVERDUE"],
  ["today", "TODAY"],
  ["week", "THIS_WEEK"],
  ["month", "THIS_MONTH"],
  ["none", "NO_DATE"],
];
const FILTER_FILES = [
  ["has", "WITH_FILES"],
  ["none", "WITHOUT_FILES"],
];

function filterDimLabel(dim) {
  const d = FILTER_DIMS.find((x) => x.dim === dim);
  return d ? LOCALE[d.label] : "";
}

/**
 * What a dimension is currently filtering on, as display strings in pick
 * order. Empty when the dimension is off. Drives the summary on each row of
 * the popover's root page and the applied-filter chips.
 */
function filterLabels(ui, dim) {
  const f = (ui.getFilters && ui.getFilters()) || {};
  const pick = (table, v) => {
    const row = table.find(([k]) => k === v);
    return row ? LOCALE[row[1]] : v;
  };
  switch (dim) {
    case "keyword":
      return f.keyword ? [f.keyword] : [];
    case "priority":
      return (f.priority || []).map((k) => {
        const p = priorityMeta(ui, k);
        return LOCALE[p.label] || k;
      });
    case "status":
      return (f.status || []).map((k) => {
        const c = (ui.getColumns() || []).find((x) => x.key === k);
        return (c && (c.name || LOCALE[c.label])) || k;
      });
    case "due":
      return f.due ? [pick(FILTER_DUE, f.due)] : [];
    case "files":
      return f.files ? [pick(FILTER_FILES, f.files)] : [];
    case "assignee":
      return (ui.getFilterUids() || [])
        .map((uid) => fullName(ui.getMember(uid)))
        .filter(Boolean);
    default:
      return [];
  }
}

module.exports = {
  FILTER_DIMS,
  FILTER_DUE,
  FILTER_FILES,
  filterDimLabel,
  filterLabels,
  mayCreateTask,
  subtaskBadge,
  PRIORITY_RANK,
  fullName,
  assigneeUids,
  formatDue,
  formatDueRange,
  isOverdue,
  priorityMeta,
  statusMeta,
};
