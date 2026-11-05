// Composer link card (Lexis 2026-11-04): floats above the input while a Drumee
// link sits in it — see libs/drumee-link-card for what a card may show.
// Note content is rendered as HTML and file names are user-chosen: every text
// goes through esc().
const { esc } = require("libs/drumee-link-card");

/**
 * Empty holder, part of the chat footer. Closed until a link is detected.
 * @param {LetcBox} ui chat widget
 */
function holder(ui) {
  return Skeletons.Box.Y({
    className: `${ui.fig.family}__link-preview`,
    sys_pn: "composer-link-card",
    dataset: { state: _a.closed },
  });
}

/**
 * The card itself.
 * @param {LetcBox} ui chat widget
 * @param {Object} model cardModel() output (libs/drumee-link-card)
 */
function card(ui, model) {
  const pfx = `${ui.fig.family}__link-card`;
  const visual = model.badge
    ? Skeletons.Box.Y({
        className: `${pfx}-visual`,
        kids: [
          Skeletons.Box.Y({
            className: `${pfx}-rows`,
            kids: [
              Skeletons.Note({ className: `${pfx}-row`, content: "" }),
              Skeletons.Note({ className: `${pfx}-row`, content: "" }),
              Skeletons.Note({ className: `${pfx}-row`, content: "" }),
            ],
          }),
          Skeletons.Box.X({
            className: `${pfx}-badge`,
            kids: [
              Skeletons.Image.Svg({ ico: "apps-lock-simple", className: `${pfx}-badge-ico` }),
              Skeletons.Note({ className: `${pfx}-badge-text`, content: esc(model.badge) }),
            ],
          }),
        ],
      })
    : null;

  return Skeletons.Box.X({
    className: pfx,
    dataset: { tone: model.tone },
    kids: [
      Skeletons.Box.X({
        className: `${pfx}-icon`,
        kids: [Skeletons.Image.Svg({ ico: model.icon, className: `${pfx}-ico` })],
      }),
      Skeletons.Box.Y({
        className: `${pfx}-body`,
        kids: [
          Skeletons.Note({ className: `${pfx}-label`, content: `Drumee · ${esc(model.label)}` }),
          Skeletons.Note({ className: `${pfx}-title`, content: esc(model.title) }),
          model.desc ? Skeletons.Note({ className: `${pfx}-desc`, content: esc(model.desc) }) : null,
        ],
      }),
      visual,
      Skeletons.Button.Svg({
        ico: "cross",
        className: `${pfx}-close`,
        service: "close-link-card",
        tooltips: LOCALE.LINK_CARD_HIDE,
        uiHandler: [ui],
      }),
    ],
  });
}

module.exports = { holder, card };
