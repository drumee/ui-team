// ==================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : ./src/drumee/builtins/window/adminpanel/skeleton/common/dropdown.js
//   TYPE : Skeleton
// ==================================================================== *
/// <reference path="../../../../../../../@types/index.d.ts" />

function __skl_admin_panel_common_dropdown (_ui_) {
  if (!Visitor.domainCan(_K.permission.admin_security)){
    return '';
  }

  /**
   *  @type {[{display: string, value: ?, mode?: string,selected ?: boolean }]}
   * */
  let pages = [
    {display: LOCALE.MEMBERS, value: 'members_page', selected : true}, //'Members'
  ];

  if (Visitor.domainCan(_K.permission.admin_security)) {
    pages.push({display: LOCALE.SECURITY, value: 'security_page', mode: _a.disable})
  }

  if (Visitor.domainCan(_K.permission.admin)) {
    pages.unshift({display: LOCALE.DOMAIN, value: 'domain_page' }),
    pages.push({display: LOCALE.SUBSCRIPTION, value: 'subscription_page', mode: _a.disable})
  }
  
  const dropdownMenu = {
    kind    : 'widget_dropdown_menu',
    options : pages
  }
  
  let a = Skeletons.Box.Y({
    className  : `${_ui_.fig.family}__dropdown_main`,
    debug      : __filename,
    kids       : [
      Skeletons.Box.X({
      className  : `${_ui_.fig.family}__dropdown_container`,
      kids       : [dropdownMenu]
      })
    ]
  })

  return a;

};

export default __skl_admin_panel_common_dropdown;
