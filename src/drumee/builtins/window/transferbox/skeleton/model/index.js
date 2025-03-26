/* ================================================================== *
 * Copyright Xialia.com  2011-2021
 * FILE : src/drumee/builtins/window/transferbox/skeleton/model/index.js
 * TYPE : Skelton
 * ===================================================================**/

function __skl_transfer_box_model  (_ui_,options){
  const modelFig = `${_ui_.fig.family}-model`;
  
  const close = Skeletons.Box.X({
    className   : `${modelFig}__close`,
    kids        : [
      Skeletons.Button.Svg({
        ico         : 'account_cross',
        className   : `${modelFig}__icon close account_cross`,
        service     : 'close-model',
        uiHandler   : _ui_
      })
    ]
  });
  
  const headerContent = Skeletons.Box.Y({
    className   : `${modelFig}__header`,
    sys_pn      : 'popup-header-content',
  });
  let content = options.content || '';
  if (_.isString(content))
    content =  Skeletons.Note({
      className  : `${_ui_.fig.family}__content`,
      content: content
    })

  const bodyContent = Skeletons.Box.Y({
    className   : `${modelFig}__body`,
    sys_pn      : 'popup-body-content',
    kids  :[
      content
    ]
  });
  const footerContent = Skeletons.Box.Y({
    className   : `${modelFig}__footer`,
    sys_pn      : 'popup-footer-content',
  });
  
  const a = Skeletons.Box.X({
    debug       : __filename,
    className   : `${modelFig}__main`,
    kids        : [
      close,
      headerContent,
      bodyContent,
      footerContent
    ]
  });
  
  return a;
}
export default __skl_transfer_box_model;