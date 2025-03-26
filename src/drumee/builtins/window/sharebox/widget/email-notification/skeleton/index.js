/* ================================================================== *
 * Copyright Xialia.com  2011-2021
 * FILE : /src/drumee/builtins/window/sharebox/widget/email-notification/skeleton/index.js
 * TYPE : Skeleton
 * ===================================================================**/
/// <reference path="../../../../../../../../@types/index.d.ts" />

/**
 * 
 * @param {*} _ui_
 */
function __skl_sharebox_widget_email_notification  (_ui_) {
  
  let a = Skeletons.Box.Y({
    className  : `${_ui_.fig.family}__main`,
    debug      : __filename,
    kids       : [
      Skeletons.Box.X({
        className  : `${_ui_.fig.family}__container`,
        sys_pn     : `email-notification-content`,
        kids : [
          require('./content').default(_ui_)
        ]
      }),

      Preset.Button.Close(_ui_,'close-popup')
    ]
  })
  
  return a;
}

export default __skl_sharebox_widget_email_notification