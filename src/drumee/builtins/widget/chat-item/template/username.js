// ==================================================================== *
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
  // Prefer a real name, then email; fall back to the user id last so the
  // header is never blank (some rows carry only author_id).
  const fullname = displayName || e.email || m.email || e.mail || m.mail || m.author_id || e.id || e.entity_id || '';
  const safeName = safeText(fullname);
  // Colour comes from CSS (var(--normal-fg-10)); no per-user inline colour.
  const html = `<div class="${m.fig}__username-container ${m.author}">
    <div class="${m.fig}__username-content">
      ${safeName}
    </div>
  </div>`;

  return html;
};

module.exports = __chat_item_username;


