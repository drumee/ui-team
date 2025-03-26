/* ================================================================== *
 * Copyright Xialia.com  2011-2021
 * FILE : /src/drumee/builtins/window/adminpanel/widget/member-choose-admins/skeleton/index.js
 * TYPE : Skeleton
 * ===================================================================**/

// ===========================================================
//
// ===========================================================
function __skl_widget_member_chooseAdmins  (_ui_) {
  const chooseAdminFig = _ui_.fig.family

  const header = Skeletons.Box.Y({
    className : `${chooseAdminFig}__header`,
    kids      : [
      Skeletons.Note({
        className   : `${chooseAdminFig}__note title`,
        content     : LOCALE.CHOOSE_NEW_ADMIN
      }),
      Skeletons.Note({
        className   : `${chooseAdminFig}__note info`,
        content     : LOCALE.CHOOSING_ADMIN_INFO
      }),

      // Skeletons.Button.Svg({
      //   ico       : 'info',
      //   className : `${chooseAdminFig}__icon info`,
      //   tooltips  : {
      //     content   : LOCALE.CHOOSING_ADMIN_INFO
      //   }
      // }),

      Skeletons.Button.Svg({
        ico         : 'account_cross',
        className   : `${chooseAdminFig}__icon close account_cross`,
        service     : 'close-overlay',
        uiHandler   : _ui_
      })
    ]
  });

  const content = Skeletons.Box.X({
    className  : `${chooseAdminFig}__content choose-admin-content`,
    sys_pn     : 'choose-admin-content',
    kids       : [
      require('./content').default(_ui_),

      Skeletons.Box.Y({
        className  : `${chooseAdminFig}__search-result-wrapper search-result-wrapper`,
        sys_pn     : 'search-result',
        dataset    : {
          mode   : _a.closed
        }
      })
    ]
  })

  const footer = Skeletons.Box.Y({
    className  : `${chooseAdminFig}__footer`,
    kids: [
      Preset.ConfirmButtons(_ui_, {
        cancelLabel     : LOCALE.CANCEL || '',
        cancelService   : 'close-overlay',
        confirmLabel    : LOCALE.ADD || '',
        confirmService  : 'submit-selected-admins'
      })
    ]
  })

  let a = Skeletons.Box.Y({
    className  : `${chooseAdminFig}__main`,
    debug      : __filename,
    kids       : [
      Skeletons.Box.Y({
        className  : `${chooseAdminFig}__container`,
        kids : [
          header,
          content,
          footer
        ]
      })
    ]
  })

  return a;

}

export default __skl_widget_member_chooseAdmins