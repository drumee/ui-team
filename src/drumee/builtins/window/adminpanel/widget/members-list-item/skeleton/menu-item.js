// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/window/adminpanel/widget/member-list-item/skeleton/menu-item.js
//   TYPE : Skeleton
// ===================================================================**/
/// <reference path="../../../../../../../../@types/index.d.ts" />

/**
 * @param {*} _ui_
 * @param {string} _type
 * @param {any} _val
 * @param {string} _service
 * @param {string} _label
 */
function addMenuItem(_ui_, _type, _val, _service, _label) {
  const menuFig = `${_ui_.fig.family}-menu`;
  let permissionCheck = _ui_.permissionCheck.bind(_ui_)
  
  let item = Skeletons.Box.X({
    className : `${menuFig}__item`,
    kids      : [
      Skeletons.Button.Svg({
        icons         : ["editbox_shapes-roundsquare", "available"], //box-tags, backoffice_checkboxfill
        className     : `${menuFig}__icon ${_type} items-icon`,
        state         : permissionCheck(_val),
        _value        : _val,
        service       : _service,
        uiHandler     : _ui_
      }),

      Skeletons.Note({
        className : `${menuFig}__note item-label`,
        content   : _label
      })
    ]
  })

  return item;
}

/**
 * 
 * @param {*} _ui_ 
 */
function __skl_widget_member_list_item_setttings_menu_item (_ui_) {
  const menuFig = `${_ui_.fig.family}-menu`;

  const content = Skeletons.Box.Y({
    className  : `${menuFig}__content-items`,
    kids: [
      addMenuItem(_ui_, _a.checkbox, _K.privilege.admin_view, _a.view, LOCALE.VIEW_MEMBERS_LIST), //'View members list'),
      addMenuItem(_ui_, _a.checkbox, _K.privilege.admin_member, _a.manage, LOCALE.MANAGE_MEMBERS_LIST), //'Manage members list'),
      addMenuItem(_ui_, _a.checkbox, _K.privilege.admin_security, 'security', LOCALE.MANAGE_SECURITY), //LOCALE.SECURITY 'security', 'Manage Security'),
      addMenuItem(_ui_, _a.radio, _K.privilege.admin, 'owner-rights', LOCALE.ALL_OWNER_RIGHTS) //LOCALE.OWNER_RIGHTS 'owner-rights', 'All owner rights')
    ]
  })
  
  return content;
};


export default __skl_widget_member_list_item_setttings_menu_item;