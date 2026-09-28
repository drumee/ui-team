// Per-workspace unread counts for the desk rail (Chat / Task / Meet pills).
//
// BUILT FROM THE ROWS THE PANEL ALREADY HOLDS — refreshActivity's `merged`
// (activity.list rollups + channel.list_notifications task mentions +
// activity.list_task_assignments). No request of its own: the rail can never
// cost the server anything, and it cannot disagree with the bell about what is
// unread because both read the same rows.
//
// Every row here is UNREAD by construction: rollups exist only while something
// is unread, the task mentions are fetched with unread_only: 1 and the
// contact_activity rows come from the *_unread procs.
//
//   chat    — sum of `cnt` over the workspace's teamchat rollups (one rollup
//             per folder scope; the workspace team chat is ONE conversation,
//             so they add up to what that chat shows as unread).
//   task    — one per notification: assigned to me (task_assigned), mentioned
//             / replied / moved on a task of mine (task_mention), a task
//             created in or moved to a column I watch (task_column_change).
//   meeting — one per meeting notice that invites me (invite, or the same
//             meeting moved). A cancellation is not something to attend.
//   files   — new files AND folders others put in the workspace (upload,
//             create), NOT from these rows: the media rollup cannot carry a
//             folder (created without _seen_), so the server counts them from
//             yp.mfs_changelog (activity.unread_counts `files_by_hub`,
//             mfs_new_by_hub) and the panel hands that list in here.
//
// OPENING THE TAB CLEARS ITS PILL (Duy 2026-09-27). Task, Meet and Files count only
// what arrived AFTER the user last opened that tab in that workspace: `seen`
// holds, per workspace, the newest row time the tab was opened over, and a
// row counts only when it is newer. Row times are the SERVER's
// contact_activity.timestamp (`timestamp`, or `ctime` on the task mentions),
// so the client clock never enters it, and a notification the server
// refreshes in place (dedupe of a re-assign / a second move into a watched
// column) gets a new time and counts again. The notifications themselves stay
// unread in the panel — this is the rail's "new since you looked", nothing is
// written to the server. Chat is not watermarked: it clears when the chat is
// actually read (acknowledged).

const TASK_EVENTS = new Set(['task_assigned', 'task_column_change', 'task_mention']);

const toCount = (v) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

const idOf = (v) => (v == null || v === '' ? null : String(v));

/** Server time of a row, in seconds; 0 when it carries none. */
function rowTime(r) {
  if (!r) return 0;
  const t = parseInt(r.timestamp != null ? r.timestamp : r.ctime, 10);
  return Number.isFinite(t) && t > 0 ? t : 0;
}

/**
 * The workspace a row belongs to, or null when it names none. Each event keeps
 * its hub under a different name (see the server's flatten* helpers).
 */
function hubOfRow(r) {
  if (!r) return null;
  if (r.category === 'teamchat') return idOf(r.hub_id);
  if (r.event === 'task_assigned' || r.event === 'task_column_change') {
    return idOf(r.task_hub_id) || idOf(r.hub_id);
  }
  if (r.event === 'task_mention') return idOf(r.hub_id) || idOf(r.task_hub_id);
  if (r.event === 'meeting_notice') return idOf(r.meeting_hub_id) || idOf(r.hub_id);
  return null;
}

/**
 * Which rail pill a row feeds, or null for the rows it does not (files,
 * contacts, access requests, p2p chat, cancelled meetings…).
 */
function kindOfRow(r) {
  if (!r) return null;
  if (r.category === 'teamchat') return 'chat';
  if (TASK_EVENTS.has(r.event)) return 'task';
  if (r.event === 'meeting_notice') {
    return r.meeting_kind === 'cancelled' ? null : 'meeting';
  }
  return null;
}

/**
 * @param {Array} rows refreshActivity's merged rows
 * @param {Object} [seen] { [hub_id]: { task, meeting, files } } — newest row
 *                        time each tab was opened over (see the header)
 * @param {Array} [filesByHub] unread_counts.files_by_hub:
 *                        [{ hub_id, cnt, last_ts }], already cut by the server
 *                        to what came after the marks the request carried
 * @returns {Object} { [hub_id]: { chat, task, meeting, files } }
 */
function hubCounts(rows, seen, filesByHub) {
  const out = {};
  const slot = (hub) => out[hub] || (out[hub] = { chat: 0, task: 0, meeting: 0, files: 0 });
  if (Array.isArray(filesByHub)) {
    for (const f of filesByHub) {
      const hub = f ? idOf(f.hub_id) : null;
      const n = f ? toCount(f.cnt) : 0;
      if (!hub || !n) continue;
      // A mark set AFTER that request (the user opened Files meanwhile) covers
      // everything up to its newest event: nothing of it is new any more.
      const mark = seen && seen[hub] ? Number(seen[hub].files) || 0 : 0;
      if (mark && (parseInt(f.last_ts, 10) || 0) <= mark) continue;
      slot(hub).files += n;
    }
  }
  if (!Array.isArray(rows)) return out;
  for (const r of rows) {
    const kind = kindOfRow(r);
    if (!kind) continue;
    const hub = hubOfRow(r);
    if (!hub) continue;
    if (kind !== 'chat') {
      const mark = seen && seen[hub] ? Number(seen[hub][kind]) || 0 : 0;
      if (mark && rowTime(r) <= mark) continue;
    }
    slot(hub)[kind] += kind === 'chat' ? toCount(r.cnt) : 1;
  }
  return out;
}

/**
 * Newest row time of one workspace's `kind` rows — what opening that tab
 * marks as seen. 0 when there is none. Files reads `filesByHub` (last_ts).
 */
function latestTime(rows, hub, kind, filesByHub) {
  let max = 0;
  if (hub == null) return max;
  if (kind === 'files') {
    for (const f of Array.isArray(filesByHub) ? filesByHub : []) {
      if (!f || idOf(f.hub_id) !== String(hub)) continue;
      const t = parseInt(f.last_ts, 10) || 0;
      if (t > max) max = t;
    }
    return max;
  }
  if (!Array.isArray(rows)) return max;
  for (const r of rows) {
    if (kindOfRow(r) !== kind || hubOfRow(r) !== String(hub)) continue;
    const t = rowTime(r);
    if (t > max) max = t;
  }
  return max;
}

module.exports = { hubCounts, hubOfRow, kindOfRow, rowTime, latestTime };
