// ==================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : /src/drumee/builtins/media/row/template/filename.coffee
//   TYPE : Skeleton
// ==================================================================== *

const { colorFromName } = require("core/utils");
const __chat_item_username = function(m) {
    let e = m.entity || m;
    let lastname = e.lastname || '';
    let surname  = e.surname || ''
    let firstname = e.firstname || surname || '';
    let fullname = surname || firstname + ' ' + lastname;
    let color = colorFromName(fullname);

  let html = `<div style="color:${color};" class="${m.fig}__message-username other">
    ${firstname}
  </div>`;

  return html;
};

module.exports = __chat_item_username;


