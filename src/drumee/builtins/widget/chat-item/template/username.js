
const { colorFromName } = require("@drumee/ui-essentials");

module.exports = function(m) {
    let e = m.entity || m;
    let lastname = e.lastname || '';
    let surname  = e.surname || ''
    let firstname = e.firstname || surname || '';
    let fullname = surname || firstname + ' ' + lastname;
    let color = colorFromName(fullname);

  return `<div style="color:${color};" class="${m.fig}__message-username other">${firstname}</div>`;

}


