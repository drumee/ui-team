
const { Autolinker } = require("autolinker");

const __chat_dod = function(m) {
  let message = m.message || '';

  // Decode both mention kinds in ONE left-to-right pass:
  //   [@filename](mention:hub_id:nid)  → file mention
  //   [@name](user:drumate_id)         → contact mention
  // A single alternating pattern is required, not two sequential replaces. The
  // label is lazy (.*?) so a filename containing "]" (e.g. "[Launch] Strategy")
  // still matches, but "." also matches "[" — so a file-mention-only pass would
  // swallow a preceding contact mention when the two are adjacent with no space
  // ("[@Huynh](user:ID)text[@img.png](mention:H:N)" collapsed into one broken
  // link). Matching both kinds together makes the regex engine stop at the first
  // complete mention it meets, so neither kind can eat the other.
  message = message.replace(
    /\[@(.*?)\]\((?:user:([^)]+)|mention:([^:)]+):([^)]+))\)/g,
    (match, label, drumateId, hubId, nid) => {
      if (drumateId) {
        // Fall back to "Unknown" so the link isn't dropped.
        const name = (label || '').trim() || 'Unknown';
        return `<a class="user-mention" data-drumate_id="${drumateId}">@${name}</a>`;
      }
      return `<a class="file-mention" data-hub_id="${hubId}" data-nid="${nid}">@${label}</a>`;
    }
  );

  message = Autolinker.link(message);
  // Empty → '' (not ' '): a file-only message renders the bubble shell for the
  // attachment card without a stray blank text line above it.
  message = message.nl2br() || '';
  html = `<div data-area="${m.area}" class="${m.fig}__conversation-content selectable-text ${m.area} ${m.author}">${message}</div>`;

  return html;
};

module.exports = __chat_dod;
