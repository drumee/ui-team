// ==================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : builins/widget/chat/skeleton/action-button.coffee
//   TYPE : Skeleton
// ==================================================================== *

const __skl_chat_action_button = function(_ui_, type) {
  this.debug("action button", _ui_);
  
  const chatBtnFig = `${_ui_.fig.family}`;

  const fowardButton = Skeletons.Note({
    className : `${chatBtnFig}__button-confirm button-confirm button clickable`,
    content   : LOCALE.FORWARD_TO, //'Forward to'
    service   : 'forward-message',
    uiHandler : _ui_
  });

  const deleteForMeButton = Skeletons.Box.X({
    className : `${chatBtnFig}__button-delete button-delete delete-for-me button clickable`,
    service   : 'delete-for-me',
    uiHandler : _ui_,
    kidsOpt   : {
      active    : 0
    },
    kids      : [
      Skeletons.Button.Svg({
        ico         : 'chat_delete',
        className   : `${chatBtnFig}__icon delete-icon chat_delete`
      }),
      
      Skeletons.Note({
        className : `${chatBtnFig}__note delete-button`,
        content   : LOCALE.FOR_ME
      }) //'for me'
    ]});
  
  const deleteForAllButton = Skeletons.Box.X({
    className : `${chatBtnFig}__button-delete button-delete delete-for-all button clickable`,
    sys_pn    : 'delete-for-all-button',
    dataset   : {
      active    : _a.yes
    },
    service   : 'delete-for-all',
    uiHandler : _ui_,
    kidsOpt   : {
      active    : 0
    },
    kids      : [
      Skeletons.Button.Svg({
        ico         : 'chat_delete',
        className   : `${chatBtnFig}__icon delete-icon chat_delete`
      }),
      
      Skeletons.Note({
        className : `${chatBtnFig}__note delete-button`,
        content   : LOCALE.FOR_ALL
      }) //'for all'
    ]});

  const cancelButton = Skeletons.Note({
    className : `${chatBtnFig}__button-cancel button-cancel button clickable`,
    content   : LOCALE.CANCEL, //'Cancel'
    service   : 'cancel-message-selection',
    uiHandler : _ui_
  });


  const a = Skeletons.Box.X({
    debug     : __filename,
    className : `${chatBtnFig}__buttons-wrapper buttons ${type}`,
    kids      : [
      cancelButton,

      type === _a.forward ?
        fowardButton : undefined,
      
      type === _a.delete ?
        deleteForMeButton : undefined,
      
      type === _a.delete ?
        deleteForAllButton : undefined
      
      //cancelButton
    ]});
  
  return a;
};

module.exports = __skl_chat_action_button;
