/**
 * Reward-flow guide coach tooltip — the small callout the Step 1 walkthrough
 * anchors next to the live-desk element it is spotlighting.
 *
 * Styled after window_confirm (see the update-desktop dialog): a branded card
 * with a drumee logo header, the guidance message, and — outside the perm
 * phase — a Back button. Unlike the tutorial's tooltipBadge it has no "Next":
 * the user advances by doing the real action; Back retreats to the Step 1 card.
 *
 * Pure function of `ui` plus a positioned `style`. `side` ("below" | "above" |
 * "left" | "right") lets the stylesheet flip any connector. `showBack` is false
 * in the perm phase — the workspace already exists, so there is nothing to go
 * back to.
 */
module.exports = function coach(ui, { text, title, style, side, showBack = true }) {
  const pfx = ui.fig.family;
  const kids = [
    Skeletons.Box.X({
      className: `${pfx}__coach-brand`,
      kids: [
        Skeletons.Image.Svg({ className: `${pfx}__coach-logo`, ico: "logo-upload" }),
        Skeletons.Note({ className: `${pfx}__coach-name`, content: "drumee" }),
      ],
    }),
  ];
  // Optional heading above the instruction (perm phase uses it to name the panel
  // the user is closing — "Who has access" / "Manage access").
  if (title) {
    kids.push(Skeletons.Note({ className: `${pfx}__coach-title`, content: title }));
  }
  kids.push(Skeletons.Note({ className: `${pfx}__coach-text`, content: text }));
  if (showBack !== false) {
    kids.push(
      Skeletons.Box.X({
        className: `${pfx}__coach-footer`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__coach-back`,
            content: LOCALE.BACK || "Back",
            service: "reward-back",
            uiHandler: [ui],
          }),
        ],
      }),
    );
  }
  return Skeletons.Box.Y({
    className: `${pfx}__coach`,
    dataset: { side: side || "below" },
    style,
    kids,
  });
};
