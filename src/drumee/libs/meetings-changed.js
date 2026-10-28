/**
 * "A meeting changed in THIS tab" — a tab-local signal for the screens that
 * list meetings.
 *
 * WHY. room.book / room.update / room.remove push `room.*` to every socket on
 * the hub EXCEPT the one that made the write (server-team room.js
 * _broadcast). A Personal Calendar mounted in that same tab therefore never
 * hears of an edit made in a folder's "Meeting information" modal, and kept
 * the old schedule until its staleness rule or a navigation reloaded it. The
 * writer announces here after a successful write; the calendar answers it the
 * way it answers a push.
 *
 * Rides RADIO_BROADCAST, guarded so tests and early boot never throw.
 */
const EVENT = "meetings:changed";

const radio = () => (typeof RADIO_BROADCAST === "undefined" ? null : RADIO_BROADCAST);

/** Tell this tab's listeners that a meeting was booked, edited or removed. */
function announceMeetingsChanged() {
  const r = radio();
  if (r) r.trigger(EVENT);
}

/**
 * Listen for the announcement.
 * @param {Function} fn
 * @returns {Function} off() — unbinds this listener
 */
function onMeetingsChanged(fn) {
  const r = radio();
  if (!r || typeof fn !== "function") return () => {};
  r.on(EVENT, fn);
  return () => r.off(EVENT, fn);
}

module.exports = { EVENT, announceMeetingsChanged, onMeetingsChanged };
