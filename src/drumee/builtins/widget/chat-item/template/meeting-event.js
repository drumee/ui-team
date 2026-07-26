/**
 * Renders the system-message card for "meeting.start" / "meeting.end" events
 * posted by window_meeting on join/leave. The card carries enough metadata
 * (hub_id + nid) for chat-item's onUiEvent("join-meeting") to reopen the
 * folder window directly on the meeting tab.
 *
 * Visual: Figma "meeting-event card" (node 2507-137937) — a self-contained card
 * with a video-camera badge, bold meeting title, a live/ended status dot, a
 * "<who> started/ended the meeting" subtitle, and a primary action button
 * ("Join meeting" while live, disabled "Meeting ended" once over).
 *
 * Expected fields on the message:
 *   - message_type: "meeting.start" | "meeting.end"
 *   - metadata (JSON): { hub_id, nid, filename, by }
 *   - fullname: poster's display name
 */
const isEmail = (v) => !!v && String(v).includes('@');

/**
 * Who started/ended the meeting. `md.by` is frozen into the message when the
 * card is posted, and cards written before the poster's profile had loaded
 * carry an email address instead of a name — which is why the same person
 * showed up as "Lexis" on one card and "lexis@example.com" on another. Skip an
 * emailish `by` and rebuild the name from the message row (same fallback chain
 * as template/username.js), keeping the email only as a last resort so the
 * subtitle is never empty.
 */
const resolveAuthor = (md, m) => {
  const e = m.entity || m;
  if (md.by && !isEmail(md.by)) return md.by;
  const lastname = e.lastname || m.lastname || '';
  const surname = e.surname || m.surname || '';
  const firstname = e.firstname || m.firstname || surname || '';
  const nonEmail = (v) => (v && !isEmail(v) ? v : '');
  const name =
    `${firstname} ${lastname}`.trim() ||
    nonEmail(e.fullname) ||
    nonEmail(m.fullname) ||
    nonEmail(e.name) ||
    nonEmail(m.name);
  return name || md.by || e.email || m.email || 'Someone';
};

module.exports = function (m) {
  let md = m.metadata || {};
  if (typeof md === 'string') {
    try { md = JSON.parse(md); } catch (e) { md = {}; }
  }

  const fig = m.fig;
  const xlink = 'xmlns:xlink="http://www.w3.org/1999/xlink"';
  // One card transitions in place: a start message flipped to
  // meeting_status='ended' renders like a legacy "meeting.end" card.
  const isEnded =
    m.message_type === 'meeting.end' || md.meeting_status === 'ended';
  const isStart = !isEnded;

  const by = resolveAuthor(md, m);
  const title = md.filename || LOCALE.MEETING || 'Meeting';
  const verb = isStart ? LOCALE.STARTED_A_MEETING : LOCALE.ENDED_THE_MEETING;

  // Header badge icon: live meeting keeps the brand video-camera; an ended
  // meeting reuses the same glyph but the card's `.end` modifier greys it.
  const badge = `<div class="${fig}__meeting-card-badge">
      <svg class="${fig}__meeting-card-ico"><use ${xlink} xlink:href="#--icon-video-camera"></use></svg>
    </div>`;

  const dot = `<span class="${fig}__meeting-card-live">
      <span class="${fig}__meeting-card-dot"></span>
    </span>`;

  const action = isStart
    ? `<span class="${fig}__meeting-card-btn"
            data-service="join-meeting"
            data-hub_id="${md.hub_id || ''}"
            data-nid="${md.nid || ''}">${LOCALE.JOIN_MEETING}</span>`
    : `<span class="${fig}__meeting-card-btn is-disabled">
        <svg class="${fig}__meeting-card-btn-ico"><use ${xlink} xlink:href="#--icon-checked-circle"></use></svg>
        <span>${LOCALE.MEETING_ENDED}</span>
      </span>`;

  return `<div class="${fig}__meeting-card ${isStart ? 'start' : 'end'}">
    <div class="${fig}__meeting-card-head">
      ${badge}
      <span class="${fig}__meeting-card-title">${title}</span>
      ${dot}
    </div>
    <span class="${fig}__meeting-card-sub">${by} ${verb}</span>
    <div class="${fig}__meeting-card-foot">
      ${action}
    </div>
  </div>`;
};
