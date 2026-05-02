/**
 * Renders the system-message card for "meeting.start" / "meeting.end" events
 * posted by window_meeting on join/leave. The card carries enough metadata
 * (hub_id + nid) for chat-item's onUiEvent("join-meeting") to reopen the
 * folder window directly on the meeting tab.
 *
 * Expected fields on the message:
 *   - message_type: "meeting.start" | "meeting.end"
 *   - metadata (JSON): { hub_id, nid, filename, by }
 *   - fullname: poster's display name
 */
module.exports = function (m) {
  let md = m.metadata || {};
  if (typeof md === 'string') {
    try { md = JSON.parse(md); } catch (e) { md = {}; }
  }

  const isStart = m.message_type === 'meeting.start';
  const by = md.by || m.fullname || 'Someone';
  const verb = isStart
    ? (LOCALE.STARTED_A_MEETING || 'started a meeting')
    : (LOCALE.ENDED_THE_MEETING || 'ended the meeting');

  const action = isStart
    ? `<span class="${m.fig}__meeting-card-action"
            data-service="join-meeting"
            data-hub_id="${md.hub_id || ''}"
            data-nid="${md.nid || ''}">${LOCALE.JOIN || 'Join'}</span>`
    : '';

  return `<div class="${m.fig}__meeting-card ${isStart ? 'start' : 'end'}">
    <span class="${m.fig}__meeting-card-dot"></span>
    <span class="${m.fig}__meeting-card-text">${by} ${verb}</span>
    ${action}
  </div>`;
};
