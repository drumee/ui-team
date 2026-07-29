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
    }
  );
}

module.exports = {
  PRIORITY_RANK,
  fullName,
  assigneeUids,
  formatDue,
  formatDueRange,
  isOverdue,
  priorityMeta,
  statusMeta,
};
