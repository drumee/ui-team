// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/window/bigchat/widget/chatcontact-list/skeleton/index.coffee
//   TYPE : Skelton
// ===================================================================**/

// ===========================================================
//
// ===========================================================
const __skl_widget_chatcontactList = function(_ui_) {
  
  let tagName = LOCALE.INDIVIDUAL_CONTACTS; 
  
  if (_ui_._currentTag && _ui_._currentTag.name) {
    tagName = _ui_._currentTag.name;
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
                ico       : 'editbox_list-circle',
                className : `${contentFig}__icon ${contentFig}__editbox_list-circle editbox_list-circle`
              }),

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
      //timer       : 200
      // spinnerWait : 100
      itemsOpt    : { 
        kind      : 'chat_contact_item',
        service   : 'open-privateroom-chat',
        radio     : 'contact_selected_'+_ui_.mget(_a.widgetId),
        uiHandler : [_ui_]
      },
      sys_pn      : 'list-contacts',
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

module.exports = __skl_widget_chatcontactList;