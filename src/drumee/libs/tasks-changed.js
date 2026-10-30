/**
 * "A task was written in THIS tab" — a tab-local signal for the screens that
 * list tasks across workspaces.
 *
 * WHY. task.create / task.update / task.update_status / task.update_assignee /
 * task.delete push `task.*` to every socket on the hub EXCEPT the one that
 * made the write (server-team task.js _broadcast — the Tasks panel stamps its
 * socket_id on every mutation). A Personal Calendar mounted in that same tab
 * therefore never heard that its user just assigned themselves a task, or
 * moved its due date, from the Tasks panel. The panel announces here after a
 * successful write; the calendar answers it the way it answers a push.
 *
 * Same shape as libs/meetings-changed. Rides RADIO_BROADCAST, guarded so
 * tests and early boot never throw.
 */
const EVENT = "tasks:changed";

// The writes that can change a calendar row: its dates, title, status, the
// assignee set that decides whether a workspace task is drawn, or existence.
const ANNOUNCING = [
  "task.create",
  "task.update",
  "task.update_status",
  "task.update_assignee",
  "task.delete",
];

const radio = () => (typeof RADIO_BROADCAST === "undefined" ? null : RADIO_BROADCAST);

/** Tell this tab's listeners that a task was written by `service`. */
function announceTasksChanged(service) {
  const r = radio();
  if (r) r.trigger(EVENT, { service });
}

/**
 * Announce a write's outcome. postService resolves undefined when a call did
 * not complete (or the panel's write guard refused it), so only a real result
 * from a row-changing service is news.
 * @returns {boolean} whether it announced
 */
function announceTaskWrite(service, result) {
  if (!ANNOUNCING.includes(`${service}`)) return false;
  if (result === undefined || result === null) return false;
  announceTasksChanged(service);
  return true;
}

/**
 * Listen for the announcement.
 * @param {Function} fn
 * @returns {Function} off() — unbinds this listener
 */
function onTasksChanged(fn) {
  const r = radio();
  if (!r || typeof fn !== "function") return () => {};
  r.on(EVENT, fn);
  return () => r.off(EVENT, fn);
}

module.exports = {
  EVENT,
  ANNOUNCING,
  announceTasksChanged,
  announceTaskWrite,
  onTasksChanged,
};
