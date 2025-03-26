// ==================================================================== *
const { colorFromName } = require("core/utils");
const __chat_item_username = function(m) {
  let fullname = m.fullname;
  let color = colorFromName(fullname);
  html = `<div class="${m.fig}__username-container ${m.author}">
    <div class="${m.fig}__username-content" style="color:${color};">
      ${fullname}
    </div>
  </div>`;

  return html;
};

module.exports = __chat_item_username;


