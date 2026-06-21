// Quick-bar for emoji reactions — a small floating pill with 6 common
// emojis and a "+" button to open the full picker.
// Rendered lazily on first hover (same pattern as menu.js).
// The caller (chat-item._hover) inserts this into the message line.
const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

const __skl_chatItem_reactions = function (_ui_) {
  const fig = _ui_.fig.family;
  const pfx = `${fig}-reactions`;

  const emojiButtons = QUICK_EMOJIS.map((emoji) =>
    Skeletons.Note({
      className: `${pfx}__emoji-btn`,
      content: emoji,
      // dataset carries the emoji value for the click handler
      dataset: { emoji, service: "react" },
      service: "react",
      uiHandler: [_ui_],
    }),
  );

  // "+" button opens the full picker
  const moreBtn = Skeletons.Note({
    className: `${pfx}__emoji-btn ${pfx}__more-btn`,
    content: "＋",
    dataset: { service: "open-emoji-picker" },
    service: "open-emoji-picker",
    uiHandler: [_ui_],
  });

  const author = _ui_.mget(_a.author);
  return Skeletons.Box.X({
    className: `${pfx}__bar ${author}`,
    sys_pn: "reaction-quick-bar",
    partHandler: _ui_,
    kids: [...emojiButtons, moreBtn],
  });
};

module.exports = __skl_chatItem_reactions;
