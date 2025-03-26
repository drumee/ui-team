// ==================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : /src/drumee/builtins/media/row/template/filename.coffee
//   TYPE : Skeleton
// ==================================================================== *

const __chat_item_avatar = function(m) {
  let url = Visitor.avatar(m.author_id, _a.vignette)
  let html = `<div class="${m.fig}__profile ${m.author}" data-flow="y"  data-online="${m.status}" data-quality="low" data-default="0">
    <img class="${m.fig}__profile-image" src="${url}">
  </div>`;

  return html;
};

module.exports = __chat_item_avatar;


