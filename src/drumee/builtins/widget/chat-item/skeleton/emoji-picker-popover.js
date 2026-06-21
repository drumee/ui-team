// Full emoji picker — dependency-free curated grid grouped by category.
// Opens from the "+" button in the quick-bar.
// Selecting an emoji emits service "emoji-picked" with { emoji } to the
// parent chat-item, which routes through _toggleReaction → triggerHandlers.
//
// Grouped by category; no external npm dependency (KISS).

const EMOJI_GROUPS = [
  {
    label: "👍",
    emojis: ["👍", "👎", "❤️", "🔥", "🎉", "🙏", "👏", "🤝", "👌", "✌️"],
  },
  {
    label: "😀",
    emojis: [
      "😀", "😂", "😍", "🤩", "😎", "😢", "😮", "😡", "🥺", "😅",
      "😆", "🤣", "😇", "🤗", "🤔", "😶", "😐", "😑", "😬", "🙄",
      "😯", "😦", "😧", "😮", "😲", "🥱", "😴", "😪", "😵", "🤐",
    ],
  },
  {
    label: "🐶",
    emojis: [
      "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯",
      "🦁", "🐮", "🐷", "🐸", "🐵", "🐔", "🐧", "🐦", "🦋", "🐛",
    ],
  },
  {
    label: "🍎",
    emojis: [
      "🍎", "🍊", "🍋", "🍇", "🍓", "🍕", "🍔", "🍟", "🌮", "🌯",
      "🍜", "🍣", "🍦", "🎂", "☕", "🍺", "🥂", "🥤", "🧃", "🍵",
    ],
  },
  {
    label: "⚽",
    emojis: [
      "⚽", "🏀", "🎾", "🏐", "🎱", "🏓", "🎸", "🎹", "🎨", "🎭",
      "🎮", "🎲", "🎯", "🏆", "🥇", "🎖️", "🎗️", "🏅", "🎀", "🎁",
    ],
  },
  {
    label: "🌍",
    emojis: [
      "🌍", "🌞", "🌙", "⭐", "🌈", "⛅", "🌊", "🏔️", "🌋", "🏝️",
      "🌸", "🌺", "🌻", "🌹", "🍀", "🌿", "🍁", "🍂", "🌵", "🎋",
    ],
  },
];

const __skl_chatItem_emojiPickerPopover = function (_ui_) {
  const fig = _ui_.fig.family;
  const pfx = `${fig}-emoji-picker`;

  const groupTabs = EMOJI_GROUPS.map((group, idx) =>
    Skeletons.Note({
      className: `${pfx}__tab`,
      content: group.label,
      dataset: { groupIdx: idx, service: "picker-group" },
      service: "picker-group",
      uiHandler: [_ui_],
    }),
  );

  const allEmojiRows = EMOJI_GROUPS.map((group, idx) => {
    const emojiNodes = group.emojis.map((emoji) =>
      Skeletons.Note({
        className: `${pfx}__emoji`,
        content: emoji,
        dataset: { emoji, service: "emoji-picked" },
        service: "emoji-picked",
        uiHandler: [_ui_],
      }),
    );
    return Skeletons.Box.G({
      className: `${pfx}__group`,
      dataset: { groupIdx: idx },
      kids: emojiNodes,
    });
  });

  const author = _ui_.mget(_a.author);
  return Skeletons.Box.Y({
    className: `${pfx}__popover ${author}`,
    sys_pn: "emoji-picker-popover",
    kids: [
      // Tab row to jump between groups
      Skeletons.Box.X({
        className: `${pfx}__tabs`,
        kids: groupTabs,
      }),
      // Scrollable emoji grid — plain Box.Y so the CSS overflow-y handles scroll
      // (no vendor scrollbar widget needed for this lightweight picker).
      Skeletons.Box.Y({
        className: `${pfx}__grid`,
        kids: allEmojiRows,
      }),
    ],
  });
};

module.exports = __skl_chatItem_emojiPickerPopover;
