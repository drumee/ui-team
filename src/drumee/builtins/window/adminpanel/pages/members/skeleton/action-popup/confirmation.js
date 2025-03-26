// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/window/adminpanel/pages/members/skeleton/action-popup/confirmation.js
//   TYPE : Skeleton
// ===================================================================**/

function __skl_members_action_popup_confirmation (_ui_) {
  const confirmFig = `${_ui_.fig.family}-action-popup-confirmation`;
  
  const close = Skeletons.Box.X({
    className   : `${confirmFig}__close`,
    kids        : [
      Skeletons.Button.Svg({
        ico         : 'account_cross',
        className   : `${confirmFig}__icon close account_cross`,
        service     : 'close-overlay',
        uiHandler   : _ui_
      })
    ]
  });
  
  const bodyContent = Skeletons.Box.Y({
    className   : `${confirmFig}__body`,
    sys_pn      : 'popup-body-content',
  });
  
  const a = Skeletons.Box.X({
    debug       : __filename,
    className   : `${confirmFig}__main`,
    kids        : [
      close,
      bodyContent
    ]
  });
  
  return a;
};

export default __skl_members_action_popup_confirmation;