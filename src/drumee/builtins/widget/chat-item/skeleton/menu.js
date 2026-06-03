// Hover action bar for a chat message. A plain horizontal row of icon buttons
// (reply / copy / forward / delete) — NOT a menu_topic dropdown, so there is no
// ⋮ trigger and no click-to-open. chat-item._hover drops this into the message
// line; skin/menu.scss floats it beside the bubble and reveals it on hover.
const __skl_chatiItem_menu = function (_ui_) {
  const author = _ui_.mget(_a.author);
  const chatMenuFig = `${_ui_.fig.family}-menu`;
  const handler = _ui_.mget(_a.uiHandler);

  const reply = Skeletons.Button.Svg({
    className: `${chatMenuFig}__item reply`,
    ico: "chat_reply",
    service: _e.reply,
    uiHandler: _ui_,
  });

  const copyText = Skeletons.Button.Svg({
    className: `${chatMenuFig}__item copy-tex`,
    ico: "chat_copy",
    service: _e.copy,
    uiHandler: _ui_,
  });

  let forwardMsg;
  if (handler.type === _a.share && handler.view === "quickChat") {
    forwardMsg = undefined;
  } else {
    forwardMsg = Skeletons.Button.Svg({
      className: `${chatMenuFig}__item forward-message`,
      ico: "chat_forward",
      service: _a.forward,
      uiHandler: _ui_,
    });
  }

  const deleteMsg = Skeletons.Button.Svg({
    className: `${chatMenuFig}__item delete-for-me`,
    ico: "chat_delete",
    service: "chat-item-delete",
    uiHandler: _ui_,
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
        ],
      }),
    ],
  });

  return menu;
};

module.exports = __skl_chatiItem_menu;
