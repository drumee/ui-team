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

const TASK_EVENTS = new Set(['task_assigned', 'task_column_change', 'task_mention']);

const toCount = (v) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

const idOf = (v) => (v == null || v === '' ? null : String(v));

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
 * @returns {Object} { [hub_id]: { chat, task, meeting } }
 */
function hubCounts(rows) {
  const out = {};
  if (!Array.isArray(rows)) return out;
  for (const r of rows) {
    const kind = kindOfRow(r);
    if (!kind) continue;
    const hub = hubOfRow(r);
    if (!hub) continue;
    const c = out[hub] || (out[hub] = { chat: 0, task: 0, meeting: 0 });
    c[kind] += kind === 'chat' ? toCount(r.cnt) : 1;
  }
  return out;
}

module.exports = { hubCounts, hubOfRow, kindOfRow };
