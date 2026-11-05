// Link card under a sent message (Lexis 2026-11-04) — see libs/drumee-link-card.
// Legacy template path (HTML string, inserted by chat-item next to the bubble
// text, like the other chat-item/template/* cards). Every text is escaped:
// file names are user-chosen.
const { esc } = require("libs/drumee-link-card");

/**
 * @param {Object} model  cardModel() output
 * @param {string} href   the link the card opens
 * @param {string} fig    chat-item fig family
 * @returns {string}
 */
const __chat_item_link_card = function (model, href, fig) {
  const pfx = `${fig}__link-card`;
  const xlink = 'xmlns:xlink="http://www.w3.org/1999/xlink"';
  const ico = (name, cls) =>
    `<svg class="${cls}" aria-hidden="true"><use ${xlink} xlink:href="#--icon-${esc(name)}"></use></svg>`;
  // Neutral cards echo the workspace-invite email: blurred rows behind a
  // lock pill ("Access Restricted").
  const visual = model.badge
    ? `<span class="${pfx}-visual" aria-hidden="true">` +
      `<span class="${pfx}-rows"><i></i><i></i><i></i></span>` +
      `<span class="${pfx}-badge">${ico("apps-lock-simple", `${pfx}-badge-ico`)}<span>${esc(model.badge)}</span></span>` +
      `</span>`
    : "";
  return (
    `<a class="${pfx}" data-tone="${esc(model.tone)}" data-link-card="1" href="${esc(href)}" target="_blank" rel="noopener noreferrer">` +
    `<span class="${pfx}-icon">${ico(model.icon, `${pfx}-ico`)}</span>` +
    `<span class="${pfx}-body">` +
    `<span class="${pfx}-label">Drumee · ${esc(model.label)}</span>` +
    `<span class="${pfx}-title">${esc(model.title)}</span>` +
    (model.desc ? `<span class="${pfx}-desc">${esc(model.desc)}</span>` : "") +
    `</span>` +
    visual +
    `</a>`
  );
};

module.exports = __chat_item_link_card;
