
// Sentinel embedded in the `message` field by window_meeting._postMeetingSystemMessage.
// Format: [[MEETING:start:{json}]] | [[MEETING:end:{json}]]
const MEETING_SENTINEL = /^\[\[MEETING:(start|end):(.+)\]\]$/;

module.exports = function (ui) {

  let html = '';
  const m = ui.model.toJSON();
  m.fig = ui.fig.family;
  let body;
  let usernameHtml = '';
  let avatar = require('./avatar')(m);

  const sentinel = typeof m.message === 'string' && m.message.match(MEETING_SENTINEL);

  const isMeeting =
    m.message_type === 'meeting.start' || m.message_type === 'meeting.end';

  if (m.message_type == _a.call) {
    body = require('./call-stat')(m)
  } else if (isMeeting || sentinel) {
    if (sentinel) {
      let parsed = {};
      try { parsed = JSON.parse(sentinel[2]); } catch (e) { /* */ }
      m.message_type = sentinel[1] === 'start' ? 'meeting.start' : 'meeting.end';
      m.metadata = parsed;
    }
    body = require('./meeting-event')(m);
  } else {
    body = require('./conversation')(m);
    const isP2P = m.type === _a.private || m.type === _a.privateRoom || m.area === _a.personal;
    if (!isP2P && m.author !== _a.me) {
      // Username stays as a label ABOVE the line (not inline with time + bubble).
      usernameHtml = require('./username')(m);
    }
  }
  const footer = require('./footer')(m);
  // Read-receipt avatar row — populated imperatively by chat-item.renderReaders()
  // from metadata._seen_ (the accumulating {uid: ts} reader map the server sends).
  const readers = `<div id="readers-${m.widgetId}" class="${m.fig}__readers ${m.author}" data-empty="1"></div>`;
  // Time (footer) + bubble share one vertically-centred row. Incoming: time
  // left of the bubble; own: time right (the row is reversed in CSS). The hover
  // action bar floats on the opposite, outer side.
  const line = `<div class="${m.fig}__message-line ${m.author}">${body}${footer}</div>`;
  // readers sit in flow below the line so they're always visible (never covered
  // or clipped by the message box / neighbouring messages).
  let content = `<div id="content-${m.widgetId}" class="${m.fig}__message-content ${m.author}">${usernameHtml}${line}${readers}</div>`;
  html = `${avatar}${content}`;
  return html;
};
