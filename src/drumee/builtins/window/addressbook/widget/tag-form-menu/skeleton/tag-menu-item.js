// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/window/addressbook/widget/tag-form-menu/skeleton/tag-menu-item.coffee
//   TYPE : Skeleton
// ===================================================================**/

// ===========================================================
//
// ===========================================================
const __skl_chat_room_tag_dropdown_menu_item = function(_ui_) {
  const menuFig = `${_ui_.fig.family}-tag-menu`;
  
  const tagPlaceholder = Skeletons.Box.Y({
    className : `${menuFig}__no-tag `,
    kids: [
      Skeletons.Box.Y({
        className  : `${menuFig}__main`,
        debug      : __filename,
        kids       : [
          Skeletons.Box.X({
            className  : `${menuFig}__container`,
            kids       : [
              Skeletons.Note({
                className : `${menuFig}__note name`,
                content   : LOCALE.NO_TAGS_YET
              })
            ]})
        ]})
    ]});

  const menuItems = Skeletons.Box.X({
    className : `${menuFig}__items-wrapper`,
    kids      : [
      Skeletons.Box.Y({
        className : `${menuFig}__list-wrapper`,
        kids      : [
          Skeletons.Note({
            className : `${menuFig}__note title`,
            content   : LOCALE.TAG
          }),

          Skeletons.List.Smart({
            className   : `${menuFig}__list tags form-input`,
            placeholder : tagPlaceholder,
            spinner     : true,
            sys_pn      : 'tag-menu-list',
            formItem    : 'tags',
            dataType    : _a.array,
            itemName    : 'tags-list',
            itemsOpt    : { 
              kind      : "contact_form_items",
              uiHandler : _ui_
            },
            api         : _ui_.getTagListApi,
            uiHandler   : [_ui_]}),

          Skeletons.Box.Y({
            className : `${menuFig}__button_wrapper`,
            service   : "save-tag",
            kidsOpt     : {
              active    : 0
            },
            kids:[
              Skeletons.Note({
                content: LOCALE.OK})
            ]})
        ]})
    ]});
  return menuItems;
};


module.exports = __skl_chat_room_tag_dropdown_menu_item;
