/* ================================================================== *
 * Copyright Xialia.com  2011-2020
 * FILE : /src/drumee/builtins/window/adminpanel/widget/member-who-can-see/skeleton/index.js
 * TYPE : Skeleton
 * ===================================================================**/

// ===========================================================
//
// ===========================================================
function __skl_widget_member_whoCanSee  (_ui_) {
  const whoCanSeeFig = _ui_.fig.family
  
  const header = Skeletons.Box.X({
    className  : `${whoCanSeeFig}__header`,
    kids       : [
      Skeletons.Note({
        className : `${whoCanSeeFig}__note title`,
        content   : LOCALE.WHO_CAN_SEE// 'Authorized contacts' 
      }),
      
      Skeletons.Button.Svg({
        ico       : 'account_cross',
        className : `${whoCanSeeFig}__icon close account_cross`,
        service   : 'close-overlay',
        uiHandler : [_ui_]
      })
    ]
  })

  const dropdownMenu = {
    kind    : 'widget_dropdown_menu',
    options : _ui_.roles
  }

  const filter = Skeletons.Box.X({
    className  : `${whoCanSeeFig}__filter`,
    sys_pn     : 'filter-wrapper',
    dataset    : { mode : _a.open },
    kids       : [
      Skeletons.Note({
        className  : `${whoCanSeeFig}__note filter-label`,
        content    : LOCALE.CHOOSE_FROM_LIST_OF//`Choose from list of`
      }),
      
      Skeletons.Box.X({
        className   : `${whoCanSeeFig}__dropdown`,
        sys_pn      : 'role-menu-list',
        kids        : [
          dropdownMenu
        ]
      }),

      Skeletons.Button.Svg({
        ico       : 'magnifying-glass',
        className : `${whoCanSeeFig}__icon search-toggle-icon magnifying-glass`,
        service   : 'toggle-search',
        uiHandler : _ui_
      })
    ]
  })

  const content = Skeletons.Box.X({
    className  : `${whoCanSeeFig}__content`,
    sys_pn     : 'seen-by-content',
    kids       : [
      Skeletons.Box.X({
        className  : `${whoCanSeeFig}__member-list`,
        sys_pn     : 'member-list-content',
      }),

      Skeletons.Box.Y({
        className : `${whoCanSeeFig}__search-result-wrapper search-result-wrapper`,
        sys_pn    : 'search-result',
        dataset   : {
          mode  : _a.closed
        }
      })
    ]
  })

  const footer = Skeletons.Box.X({
    className : `${whoCanSeeFig}__footer`,
    kids      : [
      Skeletons.Note({
        className : `${whoCanSeeFig}__button-confirm button clickable`,
        content   : LOCALE.SAVE,
        service   : 'submit-who-can-see',
        uiHandler : [_ui_]
      })
    ]
  })

  let a = Skeletons.Box.Y({
    className  : `${whoCanSeeFig}__main`,
    debug      : __filename,
    kids       : [
      Skeletons.Box.Y({
        className  : `${whoCanSeeFig}__container`,
        kids : [
          header,
          filter,
          content,
          footer
        ]
      })
    ]
  })

  return a;
}

export default __skl_widget_member_whoCanSee