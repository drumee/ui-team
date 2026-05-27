// Inline action bar shown on message hover: the action icons (reply, copy,
// forward, delete) are laid out directly in a row instead of behind a 3-dot
// dropdown trigger. Positioned over the bubble by ___widget_chatItem._hover().
const __skl_chatiItem_menu = function (_ui_) {
  const author = _ui_.mget(_a.author);
  const chatMenuFig = `${_ui_.fig.family}-menu`;
  const handler = _ui_.mget(_a.uiHandler);
  const isTicket = _ui_.mget('message_type') === _a.ticket;
  // Forward is hidden in the share "quickChat" view.
  const showForward = !((handler && handler.type === _a.share) && (handler && handler.view === 'quickChat'));

  const action = (cls, ico, service) =>
    Skeletons.Button.Svg({
      className: `${chatMenuFig}__item ${cls}`,
      ico,
      service,
      uiHandler: _ui_,
    });

  const kids = [
    action('reply', 'chat_reply', _e.reply),
    action('copy-text', 'chat_copy', _e.copy),
  ];
  if (!isTicket && showForward) kids.push(action('forward-message', 'chat_forward', _a.forward));
  if (!isTicket) kids.push(action('delete-for-me', 'chat_delete', 'chat-item-delete'));

  return Skeletons.Box.X({
    debug: __filename,
    className: `${chatMenuFig}__bar chat-item__action-bar ${author}`,
    kids,
  });
};

module.exports = __skl_chatiItem_menu;
