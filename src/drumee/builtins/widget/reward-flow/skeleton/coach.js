/**
 * Reward-flow guide coach tooltip — the small callout the Step 1 walkthrough
 * anchors next to the live-desk element it is spotlighting.
 *
 * Styled after window_confirm (see the update-desktop dialog): a branded card
 * with a drumee logo header, the guidance message, and a footer.
 *
 * Step 1's sub-steps have no Next — the user advances by doing the real action.
 * Step 3's opening beat does, because looking at the workspace window is not an
 * action the DOM can observe.
 *
 * Pure function of `ui` plus a positioned `style`. `side` ("below" | "above" |
 * "left" | "right") lets the stylesheet flip any connector. `showBack` is false
 * in Step 1's perm phase — the workspace already exists, so there is nothing to
 * go back to.
 */
module.exports = function coach(
  ui,
  { text, style, side, showBack = true, showNext = false },
) {
  const pfx = ui.fig.family;
  const kids = [
    Skeletons.Box.X({
      className: `${pfx}__coach-brand`,
      kids: [
        Skeletons.Image.Svg({ className: `${pfx}__coach-logo`, ico: "logo-upload" }),
        Skeletons.Note({ className: `${pfx}__coach-name`, content: "drumee" }),
      ],
    }),
    Skeletons.Note({ className: `${pfx}__coach-text`, content: text }),
  ];
  if (showBack !== false || showNext) {
    const footerKids = [];
    if (showBack !== false) {
      footerKids.push(
        Skeletons.Note({
          className: `${pfx}__coach-back`,
          content: LOCALE.BACK || "Back",
          service: "reward-back",
          uiHandler: [ui],
        }),
      );
    }
    // Only Step 3's "folder" beat carries a Next: it is the one sub-step with
    // no real action to perform, so nothing else would ever advance it.
    if (showNext) {
      footerKids.push(
        Skeletons.Note({
          className: `${pfx}__coach-next`,
          content: LOCALE.REWARD_FLOW_NEXT || "Next",
          service: "reward-guide-next",
          uiHandler: [ui],
        }),
      );
    }
    kids.push(
      Skeletons.Box.X({
        className: `${pfx}__coach-footer`,
        kids: footerKids,
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
