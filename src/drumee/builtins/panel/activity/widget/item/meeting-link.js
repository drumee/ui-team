/**
 * Is this media rollup row a single scheduled MEETING ("<Meeting-name> on
 * <time>") rather than an upload?
 *
 * room.book creates the meeting as a `schedule` media node, so
 * notification_center_next rolls it up like an upload. Only a SINGLE-item
 * rollup can be trusted: the rollup groups per folder and takes
 * MAX(item_filetype), so a folder holding both a meeting and a file would
 * otherwise be read as a meeting.
 *
 * Shared by the row's sentence (skeleton) and its click (index), so the row
 * can never read as a meeting and then open like a file, or the reverse.
 *
 * @param {Object} data the row's attributes (model.toJSON())
 * @returns {boolean}
 */
function isMeetingRollup(data = {}) {
  const itemFiletype = data.item_filetype || data.uploaded_filetype;
  return itemFiletype === 'schedule' && (parseInt(data.cnt, 10) || 0) <= 1;
}

/**
 * The part of a "#/desk/wm/reveal/" link that opens one meeting's card on the
 * Meet tab (Wm.openNotificationLocation → openMeetingDeepLink). Empty without
 * a meeting id, which leaves the link's activeTab to land on the calendar
 * alone. open_meeting_stime anchors the calendar on the meeting's week so the
 * card's row is inside the range the tab fetches.
 *
 * @param {String} meetingNid the meeting's `schedule` node
 * @param {Number|String} [stime] its start, epoch SECONDS
 * @returns {String}
 */
function meetingDeepLink(meetingNid, stime) {
  if (!meetingNid || `${meetingNid}` === '0') return '';
  const at = parseInt(stime, 10) || 0;
  return `&open_meeting_nid=${encodeURIComponent(meetingNid)}`
    + (at ? `&open_meeting_stime=${at}` : '');
}

module.exports = { isMeetingRollup, meetingDeepLink };
