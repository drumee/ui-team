const {
  badgePersonal,
} = require("builtins/media/grid/template/folder/badge-personal");

function gradient_logo(ui, c) {
  return Skeletons.Box.X({
    className: `${ui.fig.family}__logo`,
    kids: [
      Skeletons.Element({
        content: badgePersonal({
          area: _a.personal,
          widgetId: `${ui.mget(_a.widgetId)}-${c}`,
        }),
        className: `${ui.fig.family}__icon logo ${c}`,
      }),
    ],
  });
}

function item(ui, title, description, isFeture) {
  const fig = `${ui.fig.family}__content-item`;

  let titleItem;
  if (isFeture) {
    titleItem = Skeletons.Box.X({
      className: `${fig} feature-title`,
      kids: [
        Skeletons.Note({
          content: title,
        }),
      ],
    });
  } else {
    titleItem = Skeletons.Box.X({
      className: `${fig} title`,
      kids: [
        Skeletons.Note({
          content: title,
        }),
      ],
    });
  }
  return Skeletons.Box.Y({
    className: `${fig} container`,
    kids: [
      titleItem,
      Skeletons.Box.X({
        className: `${fig} description`,
        kids: [
          Skeletons.Note({
            content: description,
          }),
        ],
      }),
    ],
  });
}

/**
 *
 * @param {*} ui
 * @param {*} opt
 * @returns
 */
function welcome(ui) {
  return [
    gradient_logo(ui, "c1"),
    item(
      ui,
      "What is Drumee?",
      "The moon over Eldoria shimmered with an iridescent glow as the floating lantern trees awakened from their slumber, releasing gentle pulses of silver light into the evening air. Travelers along the crystal path paused to listen, for it was said that the trees whispered ancient stories to those who stood still long enough. A soft breeze carried the scent of starfruit blossoms, and somewhere in the distance, the skywhales began their nightly migration, singing low melodic tones that resonated through every stone and leaf. Though no one knew what tomorrow would bring, that night wrapped the world in quiet wonder, as if time itself were holding its breath.",
      false
    ),
    item(
      ui,
      "Drumee features",
      "The moon over Eldoria shimmered with an iridescent glow as the floating lantern trees awakened from their slumber, releasing gentle pulses of silver light into the evening air. Travelers along the crystal path paused to listen, for it was said that the trees whispered ancient stories to those who stood still long enough. A soft breeze carried the scent of starfruit blossoms, and somewhere in the distance, the skywhales began their nightly migration, singing low melodic tones that resonated through every stone and leaf. Though no one knew what tomorrow would bring, that night wrapped the world in quiet wonder, as if time itself were holding its breath.",
      true
    ),
  ];
}

export default welcome;
