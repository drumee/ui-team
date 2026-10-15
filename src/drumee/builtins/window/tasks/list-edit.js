// Pure helpers for the List view's inline cell editing (Figma "Task List
// Inline Edit", 741:92816).
//
// Every inline edit goes through the SAME write services the detail card uses
// (task.update / task.update_status / task.update_assignee) — no second write
// path. This module only decides WHAT to send for one field, and how to word
// the "X updated …" toast a peer's edit raises.
//
// No DOM and no `this`: everything here runs under plain node in a test.

// The editable columns, in list order. `text` fields open the inline input
// with ✓ / ✕; everything else opens an anchored popover.
const FIELDS = [
  "title",
  "priority",
  "status",
  "start_date",
  "due_date",
  "description",
  "files",
  "assignees",
  "reporter",
];
const TEXT_FIELDS = ["title", "description"];

const trim = (v) => String(v == null ? "" : v).trim();

// Longest title any create/update path accepts. Counted in characters (code
// points), as MariaDB counts the varchar — not UTF-16 units, which would let
// an emoji count twice.
const TITLE_MAX = 250;
const titleTooLong = (v) => Array.from(trim(v)).length > TITLE_MAX;
const day = (v) => (v ? String(v).slice(0, 10) : "");

// task_update writes BOTH dates unconditionally (a missing one is cleared), so
// every task.update carries the task's current pair unless the edit is one of
// them. Same contract as planDetailCommit.
function datesOf(task) {
  return {
    due_date: day(task.due_date) || null,
    start_date: day(task.start_date) || null,
  };
}

/**
 * What to send for one inline edit.
 *
 * @param {Object} task   the cached row
 * @param {String} field  one of FIELDS (files are linked one by one, not here)
 * @param {*}      value  the new value
 * @returns {null|{error:String}|{service:String, args:Object, local:Object}}
 *   null when nothing changed (no request at all — cancelling is free);
 *   `{error}` when the value is refused client-side; otherwise the service,
 *   its payload (without id/hub_id) and the optimistic patch for the cache.
 */
function fieldPatch(task, field, value) {
  if (!task) return null;
  switch (field) {
    case "title": {
      const title = trim(value);
      if (!title) return { error: "empty" };
      if (titleTooLong(title)) return { error: "too-long" };
      if (title === trim(task.title)) return null;
      return {
        service: "task.update",
        args: { title, ...datesOf(task) },
        local: { title },
      };
    }
    case "description": {
      const description = String(value == null ? "" : value).replace(/\s+$/, "");
      if (description === String(task.description || "").replace(/\s+$/, "")) return null;
      return {
        service: "task.update",
        // No new tags can come from a plain-text edit.
        args: { description, mention_uids: [], ...datesOf(task) },
        local: { description },
      };
    }
    case "priority": {
      if (!value || value === task.priority) return null;
      return {
        service: "task.update",
        args: { priority: value, ...datesOf(task) },
        local: { priority: value },
      };
    }
    case "reporter": {
      const cur = task.reporter_uid || task.created_by || "";
      if (!value || String(value) === String(cur)) return null;
      return {
        service: "task.update",
        args: { reporter_uid: value, ...datesOf(task) },
        local: { reporter_uid: value },
      };
    }
    case "start_date":
    case "due_date": {
      const next = day(value);
      const cur = datesOf(task);
      let start = field === "start_date" ? next || null : cur.start_date;
      let due = field === "due_date" ? next || null : cur.due_date;
      // Keep the range ordered. A start moved past the due date keeps the
      // start the user picked and CLEARS the due date, so the cell shows the
      // "Due date" placeholder and asks for a new one. Dragging the due date
      // along used to collapse the range to one day, and that dropped the start
      // the user had just picked. A due date moved before the start still
      // pulls the start in.
      if (start && due && start > due) {
        if (field === "start_date") due = null;
        else start = due;
      }
      // A range of one day is a single-day task.
      if (start && due && start === due) start = null;
      if (start === cur.start_date && due === cur.due_date) return null;
      return {
        service: "task.update",
        args: { due_date: due, start_date: start },
        local: { due_date: due, start_date: start },
      };
    }
    case "status": {
      if (!value || value === task.status) return null;
      return {
        service: "task.update_status",
        args: { status: value },
        local: { status: value },
      };
    }
    case "assignees": {
      const next = Array.isArray(value) ? value.map(String) : [];
      const cur = (Array.isArray(task.assignee_uids) ? task.assignee_uids : []).map(String);
      if (next.length === cur.length && next.every((u) => cur.includes(u))) return null;
      return {
        service: "task.update_assignee",
        args: { assignee_uids: next },
        local: { assignee_uids: next },
      };
    }
    default:
      return null;
  }
}

// Toggle one uid in a list (the assignee popover is multi-select).
function toggleUid(list, uid) {
  const out = (Array.isArray(list) ? list : []).map(String);
  const u = String(uid);
  const i = out.indexOf(u);
  if (i === -1) out.push(u);
  else out.splice(i, 1);
  return out;
}

// "10/06/2026" ⇄ "2026-06-10" — the date popover's typed field is dd/mm/yyyy
// (Figma). Returns "" for anything that is not a real calendar day.
function parseDateInput(s) {
  const m = /^\s*(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})\s*$/.exec(String(s || ""));
  if (!m) return "";
  const d = +m[1];
  const mo = +m[2];
  const y = +m[3];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) {
    return "";
  }
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function formatDateInput(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ""));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}

/**
 * The date popover's month, Sunday first (Figma: Su Mo Tu We Th Fr Sa).
 * @param {String} month "YYYY-MM"
 * @returns {Array<Array<String|null>>} weeks of "YYYY-MM-DD", null = padding
 */
function monthGrid(month) {
  const [y, mo] = String(month).split("-").map(Number);
  const first = new Date(Date.UTC(y, mo - 1, 1)).getUTCDay();
  const days = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  const cells = [];
  for (let i = 0; i < first; i++) cells.push(null);
  for (let d = 1; d <= days; d++) {
    cells.push(`${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }
  while (cells.length % 7) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

function shiftMonth(month, dir) {
  const [y, mo] = String(month).split("-").map(Number);
  const dt = new Date(Date.UTC(y, mo - 1 + dir, 1));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}`;
}

const fill = (tpl, vars) =>
  String(tpl || "").replace(/\{(\w+)\}/g, (_, k) => (vars[k] == null ? "" : vars[k]));

/**
 * The line a peer's edit puts on the "Updated by" toast (Figma 762:88650 …).
 *
 * @param {String} service  the WS service
 * @param {Object} prev     the cached row BEFORE the peer patch was merged
 * @param {Object} patch    the peer patch (peerPatch output)
 * @param {Object} ctx      { t: templates, priorityName(key), statusName(key) }
 * @returns {String} "" when nothing the list shows changed
 */
function describePeerChange(service, prev, patch, ctx) {
  if (!prev || !patch) return "";
  const t = ctx.t || {};
  const task = trim(prev.title);
  const has = (k) => Object.prototype.hasOwnProperty.call(patch, k);
  const moved = (k) => has(k) && String(patch[k] == null ? "" : patch[k]) !== String(prev[k] == null ? "" : prev[k]);
  switch (service) {
    case "task.update":
      if (moved("title")) return fill(t.renamed, { from: task, to: trim(patch.title) });
      if (moved("priority")) {
        return fill(t.priority, { value: ctx.priorityName(patch.priority), task });
      }
      if (has("start_date") && day(patch.start_date) !== day(prev.start_date)) {
        return fill(t.start, { task });
      }
      if (has("due_date") && day(patch.due_date) !== day(prev.due_date)) {
        return fill(t.due, { task });
      }
      if (moved("description")) return fill(t.description, { task });
      // An un-backfilled row reports as its creator (COALESCE in the SPs).
      if (
        has("reporter_uid") &&
        String(patch.reporter_uid || patch.created_by || "") !==
          String(prev.reporter_uid || prev.created_by || "")
      ) {
        return fill(t.reporter, { task });
      }
      return "";
    case "task.update_status":
      if (!moved("status")) return "";
      return fill(t.status, { value: ctx.statusName(patch.status), task });
    case "task.update_assignee": {
      const before = (prev.assignee_uids || []).map(String);
      const after = (patch.assignee_uids || []).map(String);
      const added = after.filter((u) => !before.includes(u)).length;
      if (added) return fill(added === 1 ? t.assignedOne : t.assigned, { n: added, task });
      if (after.length !== before.length) return fill(t.assignees, { task });
      return "";
    }
    case "task.link_file":
      return fill(t.files, { task });
    case "task.unlink_file":
      return fill(t.unlinked, { task });
    default:
      return "";
  }
}

module.exports = {
  TITLE_MAX,
  titleTooLong,
  FIELDS,
  TEXT_FIELDS,
  fieldPatch,
  toggleUid,
  parseDateInput,
  formatDateInput,
  monthGrid,
  shiftMonth,
  describePeerChange,
};
