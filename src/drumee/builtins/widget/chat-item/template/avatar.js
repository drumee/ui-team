
const __chat_item_avatar = function(m) {
  let html = `<div class="${m.fig}__profile ${m.author}" data-flow="y"  data-online="${m.status}" data-quality="low" data-default="0">
    <img class="${m.fig}__profile-image" id="${m.widgetId}-avatar">
  </div>`;

  return html;
};

module.exports = __chat_item_avatar;


