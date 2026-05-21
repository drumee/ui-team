
// Sentinel embedded in the `message` field by window_meeting._postMeetingSystemMessage.
// Format: [[MEETING:start:{json}]] | [[MEETING:end:{json}]]
const MEETING_SENTINEL = /^\[\[MEETING:(start|end):(.+)\]\]$/;

module.exports = function (ui) {

  let html = '';
  const m = ui.model.toJSON();
  m.fig = ui.fig.family;
  let body;
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
      body = `${require('./username')(m)}${body}`;
    }
  }
  const footer = require('./footer')(m);
  let content = `<div id="content-${m.widgetId}" class="${m.fig}__message-content ${m.author}">${body}${footer}</div>`;
  html = `${avatar}${content}`;
  return html;
};
