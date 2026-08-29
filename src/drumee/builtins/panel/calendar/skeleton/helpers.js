// Shared pure helpers for the Personal Calendar: the calendar.list row
// contract, the status/priority vocabulary, and the date maths the three views
// agree on. Globals Dayjs / LOCALE / Skeletons are injected at runtime.
//
// ── calendar.list contract ────────────────────────────────────────────────────
// GET calendar.list { from: 'YYYY-MM-DD', to: 'YYYY-MM-DD', kinds: ['task','meeting'] }
// answers a flat, time-sorted list of rows:
//
//   kind          'task' | 'meeting'
//   id            record id in its OWN store (task id / meeting nid)
//   hub_id        owning hub — REQUIRED: every write goes back to this hub, and
//                 "Open in folder" cannot be built without it
//   nid           the folder a task was created in (provenance only — a task
//                 belongs to its workspace) / the meeting node (meetings)
//   scope         'workspace' | 'personal' ('folder' from an older server, read
//                 as a synonym of 'workspace')
//   origin_name   workspace name, null when personal. Tasks and meetings are
//                 both workspace-level, so one pill names one thing.
//   title         display title
//   description   agenda / note, may be empty
//   due_date      'YYYY-MM-DD' — tasks only. Tasks are all-day items.
//   start_date    'YYYY-MM-DD' — tasks only, set when the task has a duration
//   stime/etime   UNIX-EPOCH SECONDS — meetings only. The server names these the
//                 canonical meeting time (room.js); `date` is a human display
//                 string kept for back-compat and must NOT be parsed.
//   status        column key: one of STATUSES below, or a custom column id
//   status_label  resolved label — the server sends it because a custom column
//                 lives in a workspace database this client never opened
//   status_theme  resolved palette KEY for a custom column ('purple', 'red', …);
//                 mapped to a hex by COLUMN_THEMES below, which is the board's
//                 own palette so a column tints identically in both surfaces
//   status_color  an explicit hex, if a caller ever sends one — takes precedence
//   priority      'low' | 'medium' | 'high' | 'urgent' — tasks only
//   can_write     1 when this viewer may edit the record from the Calendar
//   recur         recurrence rule { freq, until } or null — expanded CLIENT-side
//                 per the server's stated contract
//
// A row is only ever READ through normalizeRow below, which also accepts raw
// task.list / room.list rows so the views work against a partial server.

// The four built-in columns are implicit client-side and never stored
// (server task.js column_list). Keys, colours and locale keys are copied from
// the board's own COLUMNS constant so a chip reads identically in both places —
// a second status vocabulary is exactly the drift to avoid here.
const STATUSES = [
  { key: "todo", label: "STATUS_TODO", color: "#AEAEB2", theme: "default" },
  { key: "in_progress", label: "STATUS_IN_PROGRESS", color: "#5950FF", theme: "purple" },
  { key: "to_review", label: "STATUS_TO_REVIEW", color: "#E8A13B", theme: "orange" },
  { key: "complete", label: "STATUS_COMPLETE", color: "#54B684", theme: "green" },
];

// 10-swatch column palette (Figma 2040-106090), copied verbatim from the tasks
// board's COLUMN_THEMES. calendar.list sends a custom column's `status_theme`
// (a palette KEY, which is what task_column stores) rather than a hex, so the
// mapping has to live client-side — and it has to be the same mapping the board
// uses, or one column would tint differently in the two places.
const COLUMN_THEMES = {
  default: "#AEAEB2",
  orange: "#E8A13B",
  yellow: "#EBD212",
  green: "#54B684",
  cyan: "#65D0EA",
  blue: "#71A3F4",
  purple: "#847EFF",
  pink: "#FFA8DC",
  red: "#D74E49",
};

const PRIORITIES = [
  { key: "low", label: "PRIORITY_LOW", color: "#54B684" },
  { key: "medium", label: "PRIORITY_MEDIUM", color: "#71A3F4" },
  { key: "high", label: "PRIORITY_HIGH", color: "#E8A13B" },
  { key: "urgent", label: "PRIORITY_URGENT", color: "#D74E49" },
];

const VIEWS = [
  { key: "month", label: "CAL_VIEW_MONTH" },
  { key: "week", label: "CAL_VIEW_WEEK" },
  { key: "day", label: "CAL_VIEW_DAY" },
];

const FILTERS = [
  { key: "all", label: "CAL_FILTER_ALL" },
  { key: "task", label: "CAL_FILTER_TASK" },
  { key: "meeting", label: "CAL_FILTER_MEETING" },
];

// Hour rows the week/day grids draw. Kept narrow deliberately: an all-24 ruler
// is mostly empty scroll, and the grid scrolls to the first item anyway.
const DAY_START_HOUR = 7;
const DAY_END_HOUR = 21;

const ymd = (d) => d.format("YYYY-MM-DD");

/** Dayjs for a value, or null — never throws, never returns an invalid Dayjs. */
function day(value) {
  if (value == null || value === "") return null;
  try {
    const d = Dayjs(value);
    return d && d.isValid && d.isValid() ? d : null;
  } catch {
    return null;
  }
}

/** Dayjs from UNIX-epoch seconds, or null. */
function fromEpoch(sec) {
  const n = Number(sec);
  if (!n || !isFinite(n)) return null;
  try {
    const d = Dayjs.unix(n);
    return d && d.isValid && d.isValid() ? d : null;
  } catch {
    return null;
  }
}

function statusMeta(key) {
  return STATUSES.find((s) => s.key === key) || null;
}

function priorityMeta(key) {
  return (
    PRIORITIES.find((p) => p.key === key) || {
      key,
      label: "",
      color: "#AEAEB2",
    }
  );
}

/**
 * Resolve a row's status label + colour.
 *
 * Prefers what the SERVER resolved (status_label / status_color): a folder task
 * may sit in a custom column this client has never fetched, so deriving the
 * label from the key alone would render blank for exactly the rows the Calendar
 * exists to show. Falls back to the built-in vocabulary, then to nothing.
 */
function resolveStatus(row) {
  const built = statusMeta(row.status);
  const label =
    row.status_label || (built ? LOCALE[built.label] || built.key : "");
  // Precedence: an explicit colour, then the palette key the server resolved
  // for a CUSTOM column, then the built-in's own colour. A folder task can sit
  // in a column this client never fetched, so status_theme is the only way its
  // real tint reaches the chip.
  const theme = row.status_theme || (built ? built.theme : "default");
  const color =
    row.status_color ||
    (row.status_theme ? COLUMN_THEMES[row.status_theme] : null) ||
    (built ? built.color : COLUMN_THEMES.default);
  return { key: row.status || "todo", label, color, theme };
}

/**
 * Normalize whatever the server sent into the row shape documented above.
 *
 * Tolerates raw `task.list` and `room.list` rows as well as `calendar.list`
 * rows, so the views render against a partial or stubbed backend. A meeting's
 * time lives in metadata.content on a raw room row, and flat on an aggregated
 * one — read both.
 */
function normalizeRow(raw, fallbackKind) {
  if (!raw || typeof raw !== "object") return null;

  let content = raw;
  // Raw room.list row: the meeting's fields hide in metadata.content, twice
  // JSON-encoded on some paths.
  if (raw.metadata && !raw.stime && !raw.due_date) {
    let meta = raw.metadata;
    try {
      if (typeof meta === "string") meta = JSON.parse(meta);
      let inner = meta && meta.content;
      if (typeof inner === "string") inner = JSON.parse(inner);
      if (inner && typeof inner === "object") content = { ...raw, ...inner };
    } catch {
      content = raw;
    }
  }

  const kind =
    content.kind ||
    fallbackKind ||
    (content.stime || content.etime ? "meeting" : "task");

  const id = content.id != null ? content.id : content.nid;
  if (id == null) return null;

  // 'folder' is what a server predating the workspace-scope migration sends
  // for exactly the same rows; fold it in rather than letting those rows fall
  // through every `scope === "workspace"` test as an unknown third value.
  const rawScope =
    content.scope || (Number(content.is_personal) ? "personal" : "workspace");
  const scope = rawScope === "folder" ? "workspace" : rawScope;

  const row = {
    kind,
    id,
    hub_id: content.hub_id != null ? content.hub_id : null,
    nid: content.nid != null ? content.nid : null,
    scope,
    origin_name: content.origin_name || content.folder_name || content.hub_name || null,
    title: content.title || content.filename || "",
    description: content.description || content.message || "",
    status: content.status || "todo",
    status_label: content.status_label || "",
    status_color: content.status_color || "",
    status_theme: content.status_theme || "",
    priority: content.priority || "medium",
    // can_write is the server's answer; absent means "assume not editable"
    // for a folder row and "editable" for a personal one, which is the safe
    // reading in both directions.
    can_write:
      content.can_write != null
        ? !!Number(content.can_write)
        : scope === "personal",
    recur: content.recur || null,
    recur_id: content.recur_id || null,
  };

  if (kind === "meeting") {
    row.stime = Number(content.stime) || 0;
    row.etime = Number(content.etime) || 0;
    row.all_day = !row.stime;
  } else {
    row.due_date = content.due_date || null;
    row.start_date = content.start_date || null;
    row.all_day = true;
  }
  return row;
}

/**
 * The instant a row occupies, as a Dayjs, or null when it cannot be placed.
 *
 * Meetings resolve from epoch seconds. Tasks are all-day and resolve from
 * due_date — a task with no due date has no cell and never appears, matching
 * the folder calendar.
 */
function rowStart(row) {
  if (!row) return null;
  if (row.kind === "meeting") return fromEpoch(row.stime);
  return day(row.due_date);
}

function rowEnd(row) {
  if (!row) return null;
  if (row.kind === "meeting") return fromEpoch(row.etime) || rowStart(row);
  return day(row.due_date);
}

/** 'HH:mm A' start label for a meeting chip; '' for an all-day task. */
function startLabel(row) {
  const s = row && row.kind === "meeting" ? fromEpoch(row.stime) : null;
  return s ? s.format("h:mm A") : "";
}

/**
 * Expand a recurrence rule into the occurrences that fall inside [from, to].
 *
 * Client-side by design — the server stores the rule and states that the
 * calendar expands it (room.js). An expanded occurrence carries recur_id (the
 * originating row's id) and is never editable: editing one instance of a series
 * is its own feature.
 */
function expandRecurrence(row, from, to) {
  const start = rowStart(row);
  if (!row.recur || !start) return [row];

  const freq = String(row.recur.freq || "").toLowerCase();
  const unit = freq === "daily" ? "day" : freq === "weekly" ? "week" : freq === "monthly" ? "month" : null;
  if (!unit) return [row];

  const untilRaw = row.recur.until;
  const until = untilRaw ? fromEpoch(untilRaw) || day(untilRaw) : null;
  const span = row.kind === "meeting" ? Math.max(0, (row.etime || 0) - (row.stime || 0)) : 0;

  const out = [];
  let cursor = start;
  // Wind forward to the window without iterating from the series origin, which
  // could be years back for a daily rule.
  if (cursor.isBefore(from, "day")) {
    const steps = Math.floor(from.diff(cursor, unit));
    if (steps > 0) cursor = cursor.add(steps, unit);
  }
  // Hard cap: a malformed rule must not spin. A month view is 42 days, so 400
  // occurrences is far past any legitimate window.
  let guard = 0;
  while (cursor && !cursor.isAfter(to, "day") && guard++ < 400) {
    if (!cursor.isBefore(from, "day") && (!until || !cursor.isAfter(until, "day"))) {
      if (guard === 1 && cursor.isSame(start, "day")) {
        // The series' own first instance IS the record — pushed unflagged.
        out.push(row);
      } else {
        // is_occurrence is the flag callers test, NOT recur_id: a generated
        // occurrence keeps the series' id (it has no id of its own), so
        // `recur_id !== id` — the obvious check — is always false and every
        // occurrence read as an editable original.
        const occ = {
          ...row,
          recur_id: row.recur_id || row.id,
          is_occurrence: 1,
          can_write: false,
        };
        if (row.kind === "meeting") {
          occ.stime = cursor.unix();
          occ.etime = cursor.unix() + span;
        } else {
          occ.due_date = ymd(cursor);
        }
        out.push(occ);
      }
    }
    cursor = cursor.add(1, unit);
  }
  return out.length ? out : [row];
}

/** Does this row survive the All / Task only / Meeting only filter? */
function passesFilter(row, filter) {
  if (!filter || filter === "all") return true;
  return row.kind === filter;
}

/**
 * The [from, to] window a view needs, as Dayjs pair.
 *
 * Month asks for the whole 6-row grid, not the calendar month, so the leading
 * and trailing days of adjacent months are populated rather than blank.
 */
function viewRange(view, cursor) {
  const anchor = day(cursor) || Dayjs();
  if (view === "day") return { from: anchor.startOf("day"), to: anchor.endOf("day") };
  if (view === "week") return { from: anchor.startOf("week"), to: anchor.endOf("week") };
  const gridStart = anchor.startOf("month").startOf("week");
  return { from: gridStart, to: gridStart.add(6 * 7 - 1, "day").endOf("day") };
}

/** The range label above the grid: "June 2026" / "Jun 7 – 13, 2026" / a date. */
function rangeLabel(view, cursor) {
  const anchor = day(cursor) || Dayjs();
  if (view === "day") return anchor.format("dddd, MMMM D, YYYY");
  if (view === "week") {
    const s = anchor.startOf("week");
    const e = anchor.endOf("week");
    if (s.month() === e.month()) {
      return `${s.format("MMMM D")} – ${e.format("D")}, ${e.format("YYYY")}`;
    }
    return `${s.format("MMM D")} – ${e.format("MMM D")}, ${e.format("YYYY")}`;
  }
  // Month mode names the month — never a week range, which is what the older
  // 58222:* frames showed by mistake. 43:31159 sets the comma ("June, 2026").
  return anchor.format("MMMM, YYYY");
}

module.exports = {
  STATUSES,
  PRIORITIES,
  VIEWS,
  FILTERS,
  DAY_START_HOUR,
  DAY_END_HOUR,
  ymd,
  day,
  fromEpoch,
  statusMeta,
  priorityMeta,
  resolveStatus,
  normalizeRow,
  rowStart,
  rowEnd,
  startLabel,
  expandRecurrence,
  passesFilter,
  viewRange,
  rangeLabel,
};
