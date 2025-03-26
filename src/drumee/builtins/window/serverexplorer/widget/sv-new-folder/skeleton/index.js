// ================================================================== *
//   Copyright Xialia.com  2011-2023
//   FILE : src/drumee/builtins/window/serverexplorer/widget/sv-new-folder/skeleton/index.js
//   TYPE : Skeleton
// ===================================================================**/

function __skl_sv_new_folder_popup (_ui_) {
  const confirmFig = `${_ui_.fig.family}-popup`;
  
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
    kids        : [require('./form').default(_ui_)],
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

export default __skl_sv_new_folder_popup;