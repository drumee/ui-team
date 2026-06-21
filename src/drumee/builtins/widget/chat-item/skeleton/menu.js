// Hover action bar for a chat message. A plain horizontal row of icon buttons
// (reply / copy / forward / delete) — NOT a menu_topic dropdown, so there is no
// ⋮ trigger and no click-to-open. chat-item._hover drops this into the message
// line; skin/menu.scss floats it beside the bubble and reveals it on hover.
const __skl_chatiItem_menu = function (_ui_) {
  const author = _ui_.mget(_a.author);
  const chatMenuFig = `${_ui_.fig.family}-menu`;
  const handler = _ui_.mget(_a.uiHandler);

  // Icons are the redesigned Phosphor-style set exported from Figma
  // (chat-action-*). The legacy chat_* sprites are kept untouched because
  // litechat/bigchat still reference them.
  const reply = Skeletons.Button.Svg({
    className: `${chatMenuFig}__item reply`,
    ico: "chat-action-reply",
    service: _e.reply,
    uiHandler: _ui_,
  });

  const copyText = Skeletons.Button.Svg({
    className: `${chatMenuFig}__item copy-tex`,
    ico: "chat-action-copy",
    service: _e.copy,
    uiHandler: _ui_,
  });

  let forwardMsg;
  if (handler.type === _a.share && handler.view === "quickChat") {
    forwardMsg = undefined;
  } else {
    forwardMsg = Skeletons.Button.Svg({
      className: `${chatMenuFig}__item forward-message`,
      ico: "chat-action-forward",
      service: _a.forward,
      uiHandler: _ui_,
    });
  }

  const deleteMsg = Skeletons.Button.Svg({
    className: `${chatMenuFig}__item delete-for-me`,
    ico: "chat-action-trash",
    service: "chat-item-delete",
    uiHandler: _ui_,
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
      });

  const isTicket = _ui_.mget("message_type") === _a.ticket;

  const menu = Skeletons.Box.X({
    debug: __filename,
    className: `${chatMenuFig}__dropdown chat-item__dropdown ${author}`,
    kids: [
      Skeletons.Box.X({
        className: `${chatMenuFig}__items-container ${author}`,
        flow: _a.horizontal,
        kids: [
          reply,
          copyText,
          isTicket ? undefined : forwardMsg,
          isTicket ? undefined : deleteMsg,
          selectMsg,
          react,
        ],
      }),
    ],
  });

  return menu;
};

module.exports = __skl_chatiItem_menu;
