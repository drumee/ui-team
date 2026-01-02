// ================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : /src/drumee/builtins/window/adminpanel/widget/member-list-item/skeleton/settings-menu.js
//   TYPE : Skeleton
// ===================================================================**/

// ===========================================================
//
// ===========================================================
function __skl_widget_member_list_item_settings_menu (_ui_) {
  const mListItemFig = _ui_.fig.family
  const menuFig = `${mListItemFig}-menu`;

  const menuTrigger = Skeletons.Button.Svg({
    ico       : 'editbox_cog',
    className : `${mListItemFig}__icon option-icons admin-settings settings`,
    service   : 'admin-settings',
    uiHandler : _ui_
  })
  
  const header = Skeletons.Box.X({
    className  : `${menuFig}__header`,
    kids: [
      Skeletons.Note({
        className : `${menuFig}__note title`,
        content   : LOCALE.ADMIN_RIGHTS
      })
    ]
  })

  const content = Skeletons.Box.Y({
    className  : `${menuFig}__content`,
    sys_pn     : 'settings-menu-content',
  })

  const footer = Skeletons.Box.X({
    className  : `${menuFig}__footer`,
    kids: [
      Skeletons.Box.Y({
        className : `${menuFig}__buttons-wrapper button`,
        service   : 'set-admin-rights',
        uiHandler : _ui_,
        kidsOpt   : {
          active : 0
        },
        kids      : [
          Skeletons.Note({
            content: LOCALE.OK
          })
        ]
      })
    ]
  })

  const menuItems = Skeletons.Box.X({
    className : `${menuFig}__items-wrapper`,
    kids      : [
      Skeletons.Box.Y({
        className : `${menuFig}__item-wrapper`,
        kids      : [
          header,
          content,
          footer
        ]})
    ]
  });

  const menu = Skeletons.Box.X({
    debug     : __filename,
    className : `${menuFig}__dropdown ${_ui_.fig.group}__dropdown`,
    kids      : [{
      kind        : KIND.menu.topic,
      className   : `${menuFig}__wrapper ${_ui_.fig.group}__wrapper`,
      flow        : _a.y,
      opening     : _e.click,
      sys_pn      : 'admin-settings-dropdown',
      service     : 'admin-settings-menu',
      persistence : _a.none,
      trigger     : menuTrigger,
      items       : menuItems,
      offsetY     : 20
    }]
  });
  
  return menu;
};


export default __skl_widget_member_list_item_settings_menu;