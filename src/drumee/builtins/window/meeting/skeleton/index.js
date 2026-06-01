// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : src/drumee/builtins/window/channel/
//   TYPE : Skelton
// ==================================================================== *

/**
 * Collapsible in-meeting chat panel. Reuses widget_chat bound to the team's
 * persisted hub channel (same conversation as the team window), so messages
 * sent during the call live on in the team timeline. Skipped on DMZ rooms
 * (guests have no hub channel). Toggled via the topbar chat button — see
 * toggleMeetingChat() in window/meeting/index.js.
 */
function meetingChatPanel(_ui_) {
  if (_ui_.mget(_a.area) === _a.dmz) return null;
  const pfx = _ui_.fig.family;
  // Attendees who joined via an invite-launched folder can arrive with an
  // empty `area`, which makes widget_chat's send hit the "NOT SUPPORTED"
  // default branch (no channel.post). Fall back to the shared team channel
  // so every participant posts to the same hub conversation.
  const chatArea = _ui_.mget(_a.area) || _a.share;
  return Skeletons.Box.Y({
    className: `${pfx}__chat-panel`,
    sys_pn: "meeting-chat",
    // Open by default — the chat lives as a dedicated right-hand column.
    dataset: { open: 1 },
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__chat-header`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__chat-title`,
            content: LOCALE.CHAT,
          }),
          Skeletons.Button.Svg({
            ico: "cross",
            className: `${pfx}__chat-close`,
            // Explicit close (not a toggle) so it can never re-open itself.
            service: "close-chat",
            uiHandler: [_ui_],
          }),
        ],
      }),
      {
        kind: "widget_chat",
        className: `${pfx}__chat-widget`,
        type: chatArea,
        area: chatArea,
        view: "quickChat",
        hub_id: _ui_.mget(_a.hub_id),
        nid: _ui_.mget(_a.nid),
        placeholder: LOCALE.TYPE_MESSAGE + "...",
        no_emoji: false,
        send_icon: "raw-send-chat",
        attach_icon: "chat-link-simple",
        sys_pn: "meeting-chat-widget",
      },
    ],
  });
}

const __skl_window_meeting = function (_ui_, localUser) {
  const mode = _ui_.mget(_a.mode) || "";
  const area = _ui_.mget(_a.area);
  const role = _ui_.mget(_a.role);

  const body = require('builtins/webrtc/skeleton')(_ui_, localUser);

  // Row layout: video stage (flex:1) on the left, chat as a real right-hand
  // column. The chat is a flex sibling — never an overlay — so it can't cover
  // the centered video; the stage simply occupies the remaining width.
  const kids = [body];
  const chat = meetingChatPanel(_ui_);
  if (chat) kids.push(chat);

  const a = Skeletons.Box.X({
    debug: __filename,
    sys_pn: 'xxcontent',
    className: `${_ui_.fig.family}__main ${mode} ${area} ${role}`,
    kids
  });

  return a;
};

module.exports = __skl_window_meeting;
