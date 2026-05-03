
const { Autolinker } = require("autolinker");

const __chat_dod = function(m) {
  let message = m.message || '';

  // Decode file mentions: [@filename](mention:hub_id:nid) → clickable <a> tag
  message = message.replace(
    /\[@([^\]]+)\]\(mention:([^:]+):([^)]+)\)/g,
    '<a class="file-mention" data-hub_id="$2" data-nid="$3">@$1</a>'
  );

  // Decode contact mentions; fall back to "Unknown" so the link isn't dropped.
  message = message.replace(
    /\[@([^\]]*)\]\(user:([^)]+)\)/g,
    (match, name, drumateId) => {
      const label = (name || '').trim() || 'Unknown';
      return `<a class="user-mention" data-drumate_id="${drumateId}">@${label}</a>`;
    }
  );

  message = Autolinker.link(message);
  message = message.nl2br() || ' ';
  html = `<div data-area="${m.area}" class="${m.fig}__conversation-content selectable-text ${m.area} ${m.author}">${message}</div>`;

  return html;
};

module.exports = __chat_dod;
