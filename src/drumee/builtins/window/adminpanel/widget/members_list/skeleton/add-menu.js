// ================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : /src/drumee/builtins/window/adminpanel/widget/member-list/skeleton/add-menu.js
//   TYPE : Skeleton
// ===================================================================**/
/// <reference path="../../../../../../../../@types/index.d.ts" />

/**
 * 
 * @param {*} _ui_ 
 */
function __skl_widget_member_list_add_menu (_ui_) {

  if(! Visitor.domainCan(_K.permission.admin_member)){
    return Skeletons.Box.X({});
  }

  const tagType = _ui_._currentTag.mget(_a.type)

  const menuFig = `${_ui_.fig.family}-menu`;
  
  const menuTrigger = Skeletons.Button.Svg({
    ico       : 'drumee-contact_add',
    className : `${menuFig}__icon ${menuFig}__trigger trigger-icon contact_add ${tagType}`,
    service   : 'add-menu',
    uiHandler : _ui_
  });
  
  const addMember = Skeletons.Box.X({
    className   : `${menuFig}__item`,
    service     : 'create-member',
    uiHandler   : _ui_,
    kidsOpt     : {
      active      : 0
    },
    kids        : [
      Skeletons.Note({
        className : `${menuFig}__note menu-item create`,
        content   : LOCALE.CREATE_MEMBER
      })
    ]
  });

  const importMembers = Skeletons.Box.X({
    className   : `${menuFig}__item`,
    service     : 'import-members',
    uiHandler   : _ui_,
    kidsOpt     : {
      active      : 0
    },
    kids        : [
      Skeletons.Note({
        className : `${menuFig}__note menu-item`,
        content   : LOCALE.IMPORT_MEMBERS_LIST
      })
    ]
  });

  const chooseAdmins = Skeletons.Box.X({
    className   : `${menuFig}__item`,
    service     : 'choose-admins',
    uiHandler   : _ui_,
    kidsOpt     : {
      active      : 0
    },
    kids        : [
      Skeletons.Note({
        className : `${menuFig}__note menu-item`,
        content   : LOCALE.ADD_ADMIN
      })
    ]
  });

  let menuKids = [];
  if((tagType == 'allMembers') && (Visitor.domainCan(_K.permission.admin_member))) {
    menuKids.push(addMember)
    menuKids.push(importMembers)
  }
  if((tagType == 'allAdmins') && (Visitor.domainCan(_K.permission.admin))) {
    menuKids.push(chooseAdmins)
  }
  

  const menuItems = Skeletons.Box.X({
    className : `${menuFig}__items-wrapper`,
    kids      : [
      Skeletons.Box.Y({
        className : `${menuFig}__item-wrapper`,
        kids      : menuKids
      })
    ]
  });

  const menu = Skeletons.Box.X({
    debug     : __filename,
    className : `${menuFig}__dropdown ${_ui_.fig.group}__dropdown ${tagType}`,
    kids      : [{
      kind        : KIND.menu.topic,
      className   : `${menuFig}__wrapper ${_ui_.fig.group}__wrapper`,
      flow        : _a.y,
      opening     : _e.click,
      sys_pn      : 'add-member-dropdown',
      service     : 'add-member-menu',
      persistence : _a.none,
      trigger     : menuTrigger,
      items       : menuItems
    }]
  });

  return menu;
};


export default __skl_widget_member_list_add_menu;