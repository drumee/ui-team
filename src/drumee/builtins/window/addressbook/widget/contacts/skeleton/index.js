// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : ../src/drumee/builtins/window/addressbook/widget/contacts/skeleton/index
//   TYPE :
// ==================================================================== *
const __skl_addressbook_widget_contacts = function(_ui_) {
  
  let tagName = LOCALE.ALL_CONTACTS;
  
  if (_ui_._currentTag && _ui_._currentTag.mget(_a.name)) {
    tagName = _ui_._currentTag.mget(_a.name);
  }

  const headerFig = `${_ui_.fig.family}-header`;
  const tagHeader = Skeletons.Box.X({
    className : headerFig,
    kids      : [
      Skeletons.Note({
        className   : `${headerFig}__title`,
        content     : tagName
      })
    ]});
  
  const separator = Skeletons.Box.X({
    className : `${_ui_.fig.family}__separator`});

  const contentFig = `${_ui_.fig.family}-content`;
  const content = Skeletons.Box.X({
    className     : contentFig,
    radio         : 'contact_selected_'+_ui_.mget(_a.widgetId),
    isPlaceholder : true,
    kids      : [
      Skeletons.Box.Y({
        className : `${contentFig}__items`,
        kids      : [
          Skeletons.Box.X({
            className : `${contentFig}__item`,
            kids      : [

              Skeletons.Button.Svg({
                ico       : "editbox_list-circle",
                className : `${contentFig}__icon ${contentFig}__editbox_list-circle editbox_list-circle`,
                styleOpt  : {
                  width     : 29,//27 #22
                  height    : 29
                }
              }),//27 #22
              
              Skeletons.Note({
                className : `${contentFig}__name`,
                content   : LOCALE.NO_CONTACT
              })
            ]})
        ]})
    ]});
  
  const contactList = Skeletons.List.Smart({
      className   : `${_ui_.fig.family}__item list`,
      placeholder : content,
      spinner     : true,
      minPage     : 3,
      //timer       : 200
      // spinnerWait : 2000
      itemsOpt    : { 
        kind      : 'contact_item',
        service   : 'show-contact-detail',
        radio     : 'contact_selected_'+_ui_.mget(_a.widgetId),
        uiHandler : [_ui_]
      },
      sys_pn      : "list-contacts",
      api         : _ui_.getCurrentApi
  });

  const a  = Skeletons.Box.Y({
    className : `${_ui_.fig.family}__contacts`,
    debug     : __filename,
    kids      : [
      tagHeader,
      separator,
      contactList
    ]});

  return a;
};

module.exports = __skl_addressbook_widget_contacts;
