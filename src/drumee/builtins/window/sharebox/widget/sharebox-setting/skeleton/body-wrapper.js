/* ================================================================== *
 * Copyright Xialia.com  2011-2020
 * FILE : src/drumee/builtins/window/sharebox/widget/sharebox-setting/skeleton/index.js
 * TYPE : Skeleton
 * ===================================================================**/
/// <reference path="../../../../../../../../@types/index.d.ts" />

/**
 * 
 * @param {*} _ui_
 */
function sharebox_setting_body  (_ui_) {
  
  let a = Skeletons.Box.Y({
    className  : `${_ui_.fig.family}__body-main`,
    debug      : __filename,
    kids       : [
      Skeletons.Box.X({
        className  : `${_ui_.fig.family}__page_title`,
        kids: [
          Skeletons.Note({
            className   : `${_ui_.fig.family}__page-title-note`,
            content     : LOCALE.EXTERNAL_SHAREBOX_MANAGER//"External sharebox manager"
          })
        ]
      }),
      Skeletons.Box.X({
        className  : `${_ui_.fig.family}__settings_wrapper`,
        kids: [
          require('./settings').default(_ui_)
        ]
      }),
      Skeletons.Box.X({
        className  : `${_ui_.fig.family}__notification-block_wrapper`,
        sys_pn: 'notification_list-wrapper',
        kids: [
          require('./notification-list').default(_ui_)
        ]
      })
    ]
  })
    
  return a;
}

export default sharebox_setting_body