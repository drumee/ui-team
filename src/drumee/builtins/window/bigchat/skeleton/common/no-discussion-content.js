// ==================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : /src/drumee/builtins/window/bigchat/skeleton/common/no-discussion-content.coffee
//   TYPE : Skeleton
// ==================================================================== *

const __skl_bigchat_no_discussion_content = function(_ui_) {

  const noDiscussionFig = `${_ui_.fig.family}-no-discussion`;

  const clickText       = Skeletons.Note({
    className : `${noDiscussionFig}__note click-text`,
    content   : LOCALE.CLICK_ICON
  });

  const addContact_text = Skeletons.Note({
    className : `${noDiscussionFig}__note add-contacts`,
    content   : LOCALE.TO_ADD_CONTACTS
  });

  const menuIcon  = Skeletons.Button.Svg({
    ico       : 'drumee-contact_add',
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
                content   : LOCALE.NO_DISCUSSIONS_YET
              })
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

module.exports = __skl_bigchat_no_discussion_content;
