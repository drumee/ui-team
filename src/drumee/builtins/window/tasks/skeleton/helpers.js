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

module.exports = {
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
