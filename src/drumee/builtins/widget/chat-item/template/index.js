// Sentinel embedded in the `message` field by window_meeting._postMeetingSystemMessage.
// Format: [[MEETING:start:{json}]] | [[MEETING:end:{json}]]
const MEETING_SENTINEL = /^\[\[MEETING:(start|end):(.+)\]\]$/;

module.exports = function (ui) {
  let html = "";
  const m = ui.model.toJSON();
  m.fig = ui.fig.family;
  let body;
  let usernameHtml = "";
  let avatar = require("./avatar")(m);

  const sentinel =
    typeof m.message === "string" && m.message.match(MEETING_SENTINEL);

  const isMeeting =
    m.message_type === "meeting.start" || m.message_type === "meeting.end";

  if (m.message_type == _a.call) {
    body = require("./call-stat")(m);
  } else if (m.message_type === "file.thread") {
    body = require("./file-thread-event")(m);
  } else if (isMeeting || sentinel) {
    if (sentinel) {
      let parsed = {};
      try {
        parsed = JSON.parse(sentinel[2]);
      } catch (e) {
        /* */
      }
      m.message_type =
        sentinel[1] === "start" ? "meeting.start" : "meeting.end";
      // The lifecycle status lives in the ROW metadata (meeting_status, set by
      // channel.meeting_end); carry it across before the sentinel payload
      // replaces m.metadata, so a flipped start card renders ended.
      let rowMeta = m.metadata;
      if (typeof rowMeta === "string") {
        try {
          rowMeta = JSON.parse(rowMeta);
        } catch (e) {
          rowMeta = {};
        }
      }
      if (rowMeta && rowMeta.meeting_status) {
        parsed.meeting_status = rowMeta.meeting_status;
      }
      m.metadata = parsed;
    }
    body = require("./meeting-event")(m);
  } else {
    body = require("./conversation")(m);
    // Only true 1-on-1 chats (personal / private room) hide the per-message
    // sender name. "private" is the TEAM group app (window_team) — a group, so
    // it must keep showing names; don't treat it as P2P here.
    const isP2P =
      m.type === _a.privateRoom ||
      m.area === _a.privateRoom ||
      m.area === _a.personal;
    if (!isP2P && m.author !== _a.me) {
      // Username stays as a label ABOVE the line (not inline with time + bubble).
      usernameHtml = require("./username")(m);
    }
  }
  const footer = require("./footer")(m);
  // Read-receipt avatar row — populated imperatively by chat-item.renderReaders()
  // from metadata._seen_ (the accumulating {uid: ts} reader map the server sends).
  const readers = `<div id="readers-${m.widgetId}" class="${m.fig}__readers ${m.author}" data-empty="1"></div>`;
  // Reaction chip row — populated imperatively by chat-item._renderReactions().
  // Sits IN FLOW directly below the bubble (no longer an absolute overlay), above
  // the footer/time. Starts hidden (data-empty="1" → display:none); with no
  // reactions it collapses entirely so the time sits right under the bubble.
  const reactionRow = `<div id="reactions-${m.widgetId}" class="${m.fig}__reaction-row ${m.author}" data-empty="1"></div>`;
  // The bubble sits alone on the line; the hover action bar / emoji picker float
  // above the outer corner (appended into the line on hover — see chat-item._hover
  // / _toggleReactionBar). They stay absolute, so __message-line keeps
  // overflow:visible. The reaction chips are no longer inside the line.
  const line = `<div class="${m.fig}__message-line ${m.author}">${body}</div>`;
  // Footer (date + seen tick) and readers share one row in flow below the line
  // so they're always visible (never hover-gated, covered, or clipped by the
  // message box / neighbouring messages).
  const footerLine = `<div class="${m.fig}__footer-line ${m.author}">${footer}${readers}</div>`;
  // Column order: [username] → bubble line → reaction chips → footer/time.
  let content = `<div id="content-${m.widgetId}" class="${m.fig}__message-content ${m.author}">${usernameHtml}${line}${reactionRow}${footerLine}</div>`;
  html = `${avatar}${content}`;
  return html;
};
