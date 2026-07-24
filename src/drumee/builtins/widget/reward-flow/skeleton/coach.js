/**
 * Reward-flow guide coach tooltip — the small callout the Step 1 walkthrough
 * anchors next to the live-desk element it is spotlighting.
 *
 * Unlike the tutorial's tooltipBadge it has no "Next": the user advances by
 * doing the real action (clicking Add new, then Workspace, then submitting the
 * form). Back is the only control — it retreats to the Step 1 card.
 *
 * Pure function of `ui` plus a positioned `style`. `side` ("below" | "above")
 * lets the stylesheet flip the connector. `showBack` is false in the perm
 * phase — the workspace already exists, so there is nothing to go back to.
 */
module.exports = function coach(ui, { text, style, side, showBack = true }) {
  const pfx = ui.fig.family;
  const kids = [
    Skeletons.Note({ className: `${pfx}__coach-text`, content: text }),
  ];
  if (showBack !== false) {
    kids.push(
      Skeletons.Note({
        className: `${pfx}__coach-back`,
        content: LOCALE.BACK || "Back",
        service: "reward-back",
        uiHandler: [ui],
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
