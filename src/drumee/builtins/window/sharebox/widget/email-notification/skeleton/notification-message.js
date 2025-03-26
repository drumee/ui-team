/* ================================================================== *
 * Copyright Xialia.com  2011-2021
 * FILE : /src/drumee/builtins/window/sharebox/widget/email-notification/skeleton/content.js
 * TYPE : Skeleton
 * ===================================================================**/
/// <reference path="../../../../../../../../@types/index.d.ts" />

/**
 * 
 * @param {*} _ui_
 */
function __skl_sharebox_widget_email_notification_message  (_ui_, content) {

  const contentFig = `${_ui_.fig.family}-content`;
  let check =  Skeletons.Button.Svg({
    ico : "available",//"account_check",
    className : `${contentFig}__ico`,
  });

  if( ! _ui_.emailData || _.isEmpty(_ui_.emailData) ){
    check = Skeletons.Box.X()
  }

  const message = Skeletons.Box.X({
    className  : `${contentFig}__wrapper-message`,
    kids       : [
      check,
      Skeletons.Note({
        className : `${contentFig}__note message-content`,
        content   : content || ''
      })
    ]
  })
  
  let a = Skeletons.Box.Y({
    className  : `${contentFig}__main`,
    debug      : __filename,
    kids       : [
      message
    ]
  })
  return a;
}

export default __skl_sharebox_widget_email_notification_message