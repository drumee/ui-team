const __skl_chatiItem_menu = function(_ui_) {
  let forwardMsg;
  const author = _ui_.mget(_a.author);
  const chatMenuFig = `${_ui_.fig.family}-menu`;

  const handler = _ui_.mget(_a.uiHandler);

  const menuTrigger = Skeletons.Button.Svg({
    ico       : "arrow-down",
    className : `${chatMenuFig}__icon ${chatMenuFig}__trigger menu-icon arrow-down ${author}`,
    service   : 'chat-item-menu',
    uiHandler : _ui_
  });

  const reply = Skeletons.Button.Svg({
    className : `${chatMenuFig}__item reply`,
    ico       : 'chat_reply',
    service   : _e.reply,
    uiHandler : _ui_
  });

  const copyText = Skeletons.Button.Svg({
    className : `${chatMenuFig}__item copy-tex`,
    ico       : 'chat_copy',
    service   : _e.copy,
    uiHandler : _ui_
  });
   
  if ((handler.type === _a.share) && (handler.view === 'quickChat')) {
    forwardMsg = '';
  } else {
    forwardMsg = Skeletons.Button.Svg({
      className : `${chatMenuFig}__item forward-message`,
      ico       : 'chat_forward',
      service   : _a.forward,
      uiHandler : _ui_
    });
  }

  
  const deleteMsg = Skeletons.Button.Svg({
    className : `${chatMenuFig}__item delete-for-me`,
    ico       : 'chat_delete',
    service   : _a.delete,
    uiHandler : _ui_
  });
  
  const menuItems = Skeletons.Box.X({
    className : `${chatMenuFig}__items-wrapper ${author}`,
    flow      : _a.horizontal,
    kids      : [
      Skeletons.Box.X({
        kids  : [
          reply,
          copyText,
          _ui_.mget('message_type') !== _a.ticket ?
            forwardMsg : undefined,
          _ui_.mget('message_type') !== _a.ticket ?
            deleteMsg : undefined
        ]})
    ]});
  const f = '';
  if(_ui_.showDateOfDay()) { 
    const fi = 'first-of-group'; 
  }
  const menu = Skeletons.Box.X({
    debug     : __filename,
    className : `${chatMenuFig}__dropdown chat-item__dropdown ${author} ${f}`,
    kids      : [{
      kind        : KIND.menu.topic,
      className   : `${chatMenuFig}__wrapper chat-item__dropdown-wrapper ${author}`,
      flow        : _a.y,
      direction   : _a.left,
      axis        : _a.x,
      opening     : _e.click,
      sys_pn      : "chat-item-dropdown",
      service     : "chat-item-menu",
      persistence : _a.none,
      itemsClass  : `${chatMenuFig}__items-container ${author}`,
      trigger     : menuTrigger,
      items       : menuItems
    }]});
  
  return menu;
};

module.exports = __skl_chatiItem_menu;
