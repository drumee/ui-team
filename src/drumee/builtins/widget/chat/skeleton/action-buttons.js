const __skl_chat_action_button = function(ui, type) {
  
  const chatBtnFig = `${ui.fig.family}`;

  const fowardButton = Skeletons.Note({
    className : `${chatBtnFig}__button-confirm button-confirm button clickable`,
    content   : LOCALE.FORWARD_TO, //'Forward to'
    service   : 'forward-message',
    uiHandler : ui
  });

  const deleteForMeButton = Skeletons.Note({
    className : `${chatBtnFig}__button-delete button-delete delete-for-me button clickable`,
    content   : LOCALE.FOR_ME,
    service   : 'delete-for-me',
    uiHandler : ui
  });

  const deleteForAllButton = Skeletons.Note({
    className : `${chatBtnFig}__button-delete button-delete delete-for-all button clickable`,
    sys_pn    : 'delete-for-all-button',
    dataset   : { active: _a.yes },
    content   : LOCALE.FOR_ALL,
    service   : 'delete-for-all',
    uiHandler : ui
  });

  const cancelButton = Skeletons.Note({
    className : `${chatBtnFig}__button-cancel button-cancel button clickable`,
    content   : LOCALE.CANCEL, //'Cancel'
    service   : 'cancel-message-selection',
    uiHandler : ui
  });


  const a = Skeletons.Box.X({
    debug     : __filename,
    className : `${chatBtnFig}__buttons-wrapper buttons ${type}`,
    kids      : [
      cancelButton,

      type === _a.forward ?
        fowardButton : undefined,
      
      type === 'chat-item-delete' ?
        deleteForMeButton : undefined,
      
      type === 'chat-item-delete' ?
        deleteForAllButton : undefined
      
      //cancelButton
    ]});
  
  return a;
};

module.exports = __skl_chat_action_button;
