// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/window/addressbook/widget/contact-form/skeleton/tags.coffee
//   TYPE : Skelton
// ===================================================================**/

const __skl_addressbook_widget_contact_form_tags = function(_ui_) {
  const {
    contact
  } = _ui_;
  const formFig = `${_ui_.fig.family}`;
  const formItemFig = 'addressbook-widget-contact-formItems';

  const tagPlaceholder = Skeletons.Box.Y({
    className : `${formItemFig}`,
    kids: [
      Skeletons.Box.Y({
        className  : `${formItemFig}__main`,
        debug      : __filename,
        kids       : [
          Skeletons.Box.X({
            className  : `${formItemFig}__container`,
            kids       : [
              Skeletons.Note({
                className : `${formItemFig}__note name`,
                content   : LOCALE.NO_TAGS_YET
              }) //"No Tags Yet"
            ]})
        ]})
    ]});

  const menuTrigger = Skeletons.Button.Svg({
    ico         : "editbox_arrow--down",
    className   : `${formFig}__icon input-icon tags-dropdown editbox_arrow--down`
  });

  const menuItems = Skeletons.Box.X({
    className : `${formFig}__items-wrapper`,
    kids      : [
      Skeletons.Box.Y({
        kids  : [
          Skeletons.List.Smart({
            formItem    : 'tags',
            sys_pn      : 'tag-list',
            placeholder : tagPlaceholder,
            dataType    : _a.array,
            className   : `${formFig}__list tags form-input`,
            itemName    : 'tags-list',
            itemsOpt    : { 
              kind      : "contact_form_items",
              uiHandler : _ui_
            },
            api         : _ui_.getCurrentApi
          })
        ]})
    ]});

  const menu = Skeletons.Box.X({
    debug       : __filename,
    className   : `${formFig}__dropdown tags-dropdown`,
    selectedTag : contact.tag || [],
    kids        : [{
      kind        : KIND.menu.topic,
      className   : `${formFig}__dropdown-wrapper tags-dropdown-wrapper`,
      flow        : _a.y,
      opening     : _e.click,
      sys_pn      : "tags-dropdown",
      service     : "tags-menu",
      persistence : _a.always, //_a.self
      trigger     : menuTrigger,
      items       : menuItems
    }]});
  
  const a = Skeletons.Box.X({
    className   : `${formFig}__wrapper tags form-row no-multiple`,
    debug       : __filename,
    kids        : [
      Skeletons.Button.Svg({
        ico         : "tags",
        className   : `${formFig}__icon input-icon no-multiple tags`
      }),
      
      Skeletons.Box.X({
        className   : `${formFig}__entry-wrapper tags`,
        kids        : [
          Skeletons.Note({
            className   : `${formFig}__note tags form-input`,
            content     : LOCALE.CHOOSE_ROLE, //'Choose a role'
            sys_pn      : 'contact-form-tag',
            dataset     : {
              selected  : 0
            }
          }),
          
          menu
        ]})
    ]});
  
  return a;
};

module.exports = __skl_addressbook_widget_contact_form_tags;

