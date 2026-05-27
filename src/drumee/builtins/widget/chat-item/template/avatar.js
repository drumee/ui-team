
const __chat_item_avatar = function(m) {
  // Resolve the FULL display name the same way the username label does: prefer
  // the resolved contact entity (which carries first + last name) over the
  // message-level fullname — the latter is CONCAT(firstname,' ',lastname) and
  // becomes NULL when lastname is null, collapsing to just the first name.
  const e = (m.author === 'me' && typeof Visitor !== 'undefined')
    ? (Visitor.profile ? Visitor.profile() : (Visitor.toJSON ? Visitor.toJSON() : m))
    : (m.entity || m);
  const lastname = e.lastname || m.lastname || '';
  const surname = e.surname || m.surname || '';
  const firstname = e.firstname || m.firstname || surname || '';
  const nonEmail = (v) => (v && !String(v).includes('@') ? v : '');
  const displayName = `${firstname} ${lastname}`.trim()
    || nonEmail(e.fullname) || nonEmail(m.fullname)
    || nonEmail(e.name) || nonEmail(m.name);
  const fullName = (displayName || e.email || m.email || m.author_id || '').toString().trim();
  // Exposed via data-tooltip for the styled CSS tooltip (see skin/index.scss).
  const tip = fullName.replace(/"/g, '&quot;');

  let html = `<div class="${m.fig}__profile ${m.author}" data-flow="y" data-online="${m.status}" data-quality="low" data-default="0" data-tooltip="${tip}">
    <img class="${m.fig}__profile-image" id="${m.widgetId}-avatar">
  </div>`;

  return html;
};

module.exports = __chat_item_avatar;
