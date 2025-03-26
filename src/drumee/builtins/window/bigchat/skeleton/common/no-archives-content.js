// ==================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : /src/drumee/builtins/window/bigchat/skeleton/common/no-archives-content.coffee
//   TYPE : Skeleton
// ==================================================================== *

const __skl_bigchat_no_archives_content = function(_ui_) {

  const noDiscussionFig = `${_ui_.fig.family}-no-discussion`;

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
                content   : LOCALE.NO_ARCHIVED_DISCUSSION_YET
              })
            ]})
        ]})
    ]});
  
  return a;
};

module.exports = __skl_bigchat_no_archives_content;
