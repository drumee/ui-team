/* ================================================================== *
 * Copyright Xialia.com  2011-2020
 * FILE : /src/drumee/builtins/window/adminpanel/widget/members/skeleton/index.js
 * TYPE : Skeleton
 * ===================================================================**/
/// <reference path="../../../../../../../../../@types/index.d.ts" />


function __skl_import_members_page (_ui_) {

  let cancelBtn = Skeletons.Note({
    className   : `${_ui_.fig.family}__upload-member-button cancel-btn`,
    service     : 'close-overlay',
    content     : LOCALE.CANCEL,//"Cancel",
    uiHandler : [_ui_]
  })
  let a = Skeletons.Box.Y({
    className  : `${_ui_.fig.family}__members_upload_wrapper`,
    kids: [
      Skeletons.Box.X({
        className  : `${_ui_.fig.family}__members_upload-close-wrapper`,
        kids: [
          Skeletons.Button.Svg({
            ico         : 'account_cross',
            className   : `${_ui_.fig.family}__icon close account_cross`,
            service     : 'close-overlay',
            uiHandler   : _ui_
          })
        ]
      }),
      Skeletons.Box.X({
        className  : `${_ui_.fig.family}__members_upload-title-wrapper`,
        kids: [
          Skeletons.Note({
            className  : `${_ui_.fig.family} title`,
            content: LOCALE.IMPORT_MEMBERS_LIST //"Import member list"
          })
        ]
      }),
      Skeletons.Box.X({
        className  : `${_ui_.fig.family}__members_upload-body-wrapper fullwidth`,
        sys_pn: 'upload-body-wrapper',
        kids: [
          require('./drag-a-drop').default(_ui_)
          // require('./members-list').default(_ui_)
        ]
      }),
      Skeletons.Note({
        className   : `${_ui_.fig.family}__import-list-error-msg`,
        sys_pn      : 'import-list-error-msg',
        content     : LOCALE.OOOPS_SOME_DATA_PROBLEM_OCCURES,//'Ooops some data problem occures. <br/> 1. Check red area 2. Modify your file 3.Upload again  ' ,
        dataset     : {
            state     : _a.closed
        }
      }),
      Skeletons.Box.X({
        className  : `${_ui_.fig.family}__members_upload-footer-wrapper`,
        sys_pn: 'upload-footer-wrapper',
        kids: [
          cancelBtn
        ]
      })
    ]
  })

  return a;
}

export default __skl_import_members_page;