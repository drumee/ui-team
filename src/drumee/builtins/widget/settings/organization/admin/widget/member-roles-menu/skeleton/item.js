
// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : src/drumee/builtins/window/adminpanel/widget/member-roles-menu/skeleton/item.js
//   TYPE : Skeleton
// ===================================================================**/
/// <reference path="../../../../../../../../@types/index.d.ts" />

/**
 * 
 * @param {*} _ui_ 
 */
function __skl_widget_member_roleMenu_item (_ui_) {
  const itemFig = `${_ui_.fig.family}-item`;

  const title = Skeletons.Note({
    className : `${itemFig}__note title`,
    content   : LOCALE.SERVICE//'Tag list'
  })

  let saveBtn = Skeletons.Box.X({});
  if(Visitor.domainCan(_K.permission.admin_member)){
    saveBtn = Skeletons.Box.Y({
      className : `${itemFig}__wrapper button`,
      service   : 'save-role',
      kidsOpt   : {
        active : 0
      },
      kids      : [
        Skeletons.Note({
          content : LOCALE.OK
        })
      ]
    })
  }

  const rolePlaceholder = Skeletons.Box.Y({
    className : `${itemFig}_no-role`,
    kids: [
      Skeletons.Box.Y({
        className  : `${itemFig}__main`,
        debug      : __filename,
        kids       : [
          Skeletons.Box.X({
            className  : `${itemFig}__container`,
            kids       : [
              Skeletons.Note({
                className : `${itemFig}__note name`,
                content   : LOCALE.NOT_YET_DEFINED//NO_TAGS_YET
              })
            ]})
        ]})
    ]});

  const menuItems = Skeletons.Box.X({
    className : `${itemFig}__wrapper`,
    kids      : [
      Skeletons.Box.Y({
        className : `${itemFig}__list-wrapper`,
        kids      : [
          title,
          Skeletons.List.Smart({
            className   : `${itemFig}__list roles form-input`,
            placeholder : rolePlaceholder,
            spinner     : true,
            sys_pn      : 'role-menu-list',
            formItem    : 'roles',
            dataType    : _a.array,
            itemName    : 'roles-list',
            itemsOpt    : { 
              kind        : 'widget_member_roles_menu_items',
              uiHandler   : _ui_
            },
            api         : _ui_.getRoleListApi.bind(_ui_),
            uiHandler   : _ui_
          }),
          saveBtn  
        ]})
    ]});
  
  return menuItems;

};

export default __skl_widget_member_roleMenu_item;
