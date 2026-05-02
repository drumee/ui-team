// ==================================================================== *
const { colorFromName } = require("@drumee/ui-essentials");
const __chat_item_username = function(m) {
  // "me" rows carry only author_id; pull names from Visitor for the sender.
  const e = (m.author === 'me' && typeof Visitor !== 'undefined')
    ? (Visitor.profile ? Visitor.profile() : (Visitor.toJSON ? Visitor.toJSON() : m))
    : (m.entity || m);
  const lastname = e.lastname || m.lastname || '';
  const surname = e.surname || m.surname || '';
  const firstname = e.firstname || m.firstname || surname || '';
  const safeText = (value) => String(value || '').replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  }[char]));
  const nonEmail = (value) => value && !String(value).includes('@') ? value : '';
  const displayName = `${firstname} ${lastname}`.trim() || nonEmail(e.fullname) || nonEmail(m.fullname) || nonEmail(e.name) || nonEmail(m.name);
  const fullname = displayName || e.email || m.email || e.mail || m.mail || m.author_id || '';
  const safeName = safeText(fullname);
  const color = colorFromName(fullname || 'user');
  const html = `<div class="${m.fig}__username-container ${m.author}">
    <div class="${m.fig}__username-content" style="color:${color};">
      ${safeName}
    </div>
  </div>`;

  return html;
};

module.exports = __chat_item_username;


