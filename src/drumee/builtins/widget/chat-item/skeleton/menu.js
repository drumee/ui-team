// Hover action bar for a chat message. A plain horizontal row of icon buttons
// (reply / copy / forward / delete) — NOT a menu_topic dropdown, so there is no
// ⋮ trigger and no click-to-open. chat-item._hover drops this into the message
// line; skin/menu.scss floats it beside the bubble and reveals it on hover.
const __skl_chatiItem_menu = function (_ui_) {
  const author = _ui_.mget(_a.author);
  const chatMenuFig = `${_ui_.fig.family}-menu`;
  const handler = _ui_.mget(_a.uiHandler);

  // Hover tooltip for each action icon — a dark bubble floating above the icon
  // (matches the Figma "Forward message" tooltip). The framework builds the
  // element from this `tooltips` prop and toggles it on pointerenter/leave;
  // skin/menu.scss styles + positions it (dark fill + downward caret).
  const tip = (content) => ({ content, className: `${chatMenuFig}__tooltip` });

  // Icons are the redesigned Phosphor-style set exported from Figma
  // (chat-action-*). The legacy chat_* sprites are kept untouched because
  // litechat/bigchat still reference them.
  const reply = Skeletons.Button.Svg({
    className: `${chatMenuFig}__item reply`,
    ico: "chat-action-reply",
    service: _e.reply,
    uiHandler: _ui_,
    tooltips: tip(LOCALE.REPLY),
  });

  // Second reply affordance — posts the reply INTO the referenced file's chat
  // thread instead of the folder General chat. Shown ONLY on file messages
  // (upload / mention) inside the team chat (folder window); the plain reply
  // icon above always does a normal reply. Hidden everywhere else (p2p / share
  // chats, and plain messages, have no thread). Same thread icon as the file
  // kebab "Chat Threads" entry for consistency.
  const replyInThread =
    _ui_._isTeamChat() && _ui_._hasThreadableFile() && !_ui_._isInFileThread()
      ? Skeletons.Button.Svg({
          className: `${chatMenuFig}__item reply-in-thread`,
          ico: "ctxmenu-chat-thread",
          service: "reply-in-thread",
          uiHandler: _ui_,
          tooltips: tip(LOCALE.REPLY_IN_THREAD),
        })
      : undefined;

  // Thin vertical rule setting the reply-in-thread icon apart from the standard
  // actions. Only present when the reply-in-thread icon is (file messages in
  // team chat), so the standard toolbar keeps no leading divider.
  const threadDivider = replyInThread
    ? Skeletons.Box.Y({ className: `${chatMenuFig}__divider` })
    : undefined;

  const copyText = Skeletons.Button.Svg({
    className: `${chatMenuFig}__item copy-tex`,
    ico: "chat-action-copy",
    service: _e.copy,
    uiHandler: _ui_,
    tooltips: tip(LOCALE.COPY),
  });

  // Copy the message's attachment OUT to the OS clipboard (image → image blob,
  // other file → link). Only on messages that carry an uploaded attachment.
  const copyImage = _ui_._hasAttachment && _ui_._hasAttachment()
    ? Skeletons.Button.Svg({
        className: `${chatMenuFig}__item copy-attachment`,
        ico: "image",
        service: "copy-attachment",
        uiHandler: _ui_,
        tooltips: tip(LOCALE.COPY_ATTACHMENT),
      })
    : undefined;

  let forwardMsg;
  if (handler.type === _a.share && handler.view === "quickChat") {
    forwardMsg = undefined;
  } else {
    forwardMsg = Skeletons.Button.Svg({
      className: `${chatMenuFig}__item forward-message`,
      ico: "chat-action-forward",
      service: _a.forward,
      uiHandler: _ui_,
      tooltips: tip(LOCALE.FORWARD),
    });
  }

  const deleteMsg = Skeletons.Button.Svg({
    className: `${chatMenuFig}__item delete-for-me`,
    ico: "chat-action-trash",
    service: "chat-item-delete",
    uiHandler: _ui_,
    tooltips: tip(LOCALE.DELETE),
  });

  // 5th icon — enter multi-select mode (like forward/delete): tapping it selects
  // this message and reveals the Cancel / Forward / Delete action bar so several
  // messages can be picked and forwarded or deleted-for-all at once. Reuses the
  // same show-message-selector flow as the forward/delete icons.
  const selectMsg = Skeletons.Button.Svg({
    className: `${chatMenuFig}__item select-messages`,
    ico: "chat-action-check",
    service: "select-mode",
    uiHandler: _ui_,
    tooltips: tip(LOCALE.SELECT),
  });

  // Emoji-reaction smiley: clicking opens the quick-bar (or full picker if
  // already open). Hidden for system messages (call / meeting / ticket).
  const isSystemMsg =
    _ui_._isMeeting() ||
    _ui_.mget("message_type") === _a.call ||
    _ui_.mget("is_ticket");
  const react = isSystemMsg
    ? undefined
    : Skeletons.Button.Svg({
        className: `${chatMenuFig}__item react`,
        ico: "chat-action-smiley",
        service: "open-reaction-bar",
        uiHandler: [_ui_],
        tooltips: tip(LOCALE.ADD_REACTION),
      });

  const isTicket = _ui_.mget("message_type") === _a.ticket;

  const menu = Skeletons.Box.X({
    debug: __filename,
    className: `${chatMenuFig}__dropdown chat-item__dropdown ${author}`,
    kids: [
      Skeletons.Box.X({
        className: `${chatMenuFig}__items-container ${author}`,
        flow: _a.horizontal,
        // filter(Boolean) drops the absent actions (reply-in-thread + its
        // divider on non-file/non-team messages, forward/delete on tickets,
        // react on system messages). Without it the undefined slots render as
        // empty boxes — most visibly a gap at the LEADING edge when the
        // reply-in-thread pair is absent.
        kids: [
          // reply-in-thread leads, set apart by a divider from the standard row.
          replyInThread,
          threadDivider,
          reply,
          copyText,
          copyImage,
          isTicket ? undefined : forwardMsg,
          isTicket ? undefined : deleteMsg,
          selectMsg,
          react,
        ].filter(Boolean),
      }),
    ],
  });

  return menu;
};

module.exports = __skl_chatiItem_menu;
