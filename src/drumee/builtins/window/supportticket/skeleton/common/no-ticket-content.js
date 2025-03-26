// ==================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : /src/drumee/builtins/window/supportticket/skeleton/common/no-discussion-content.coffee
//   TYPE : Skelton
// ==================================================================== *

const __skl_support_ticket_no_discussion_content = function(_ui_) {

  const noDiscussionFig = `${_ui_.fig.family}-no-discussion`;

  const clickText       = Skeletons.Note({
    className : `${noDiscussionFig}__note click-text`,
    content   : LOCALE.CLICK_ICON
  }); //CLICK_HEADER_ICON 

  const addContact_text = Skeletons.Note({
    className : `${noDiscussionFig}__note add-contacts`,
    content   : LOCALE.TO_ADD_TICKET
  });//'to add ticket' situé dans la colonne "Support"

  const menuIcon  = Skeletons.Button.Svg({
    ico       : 'desktop_plus',
    className : `${noDiscussionFig}__icon no-discussion-icon contact_add`
  });


  const a = Skeletons.Box.Y({
    debug     : __filename,
    className : `${noDiscussionFig}__content`,
    kids      : [
      Skeletons.Box.Y({
        className : `${noDiscussionFig}__wrapper`,
        kids      : [
          Skeletons.Box.X({
            className : `${noDiscussionFig}__item`,
            kids      : [
              Skeletons.Note({
                className : `${noDiscussionFig}__note no-discussion`,
                content   : LOCALE.NO_TICKET_YET_TICKETS_FILTER
              })// 'No ticket yet (or) No tickets filter' Pour signaler un premier bug,
            ]}),
          
          Skeletons.Box.X({
            className : `${noDiscussionFig}__item`,
            kids      : [
              clickText,
              menuIcon,
              addContact_text
            ]})
        ]})
    ]});
  
  return a;
};

module.exports = __skl_support_ticket_no_discussion_content;
