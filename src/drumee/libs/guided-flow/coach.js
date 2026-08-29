/**
 * Guide coach tooltip — the small callout a walkthrough anchors next to the
 * live-desk element it is spotlighting.
 *
 * Styled after window_confirm (see the update-desktop dialog): a branded card
 * with a drumee logo header, the guidance message, and a footer.
 *
 * Whether a sub-step carries a Next depends on the step, not on this file: a
 * sub-step released by the user doing the real action needs none, while one
 * that only asks them to LOOK at something has nothing the DOM could observe
 * and must have one.
 *
 * Pure function of `ui` plus a positioned `style`. `side` ("below" | "above" |
 * "left" | "right") lets the stylesheet flip any connector.
 *
 * The two services are the CALLER's, because each flow routes its own events:
 * reward-flow answers to "reward-back"/"reward-guide-next", activate-workspace
 * to its own pair. They are required rather than defaulted — a coach whose
 * buttons quietly fired another widget's services would render perfectly and
 * do nothing.
 *
 * The class prefix is the caller's too (`ui.fig.family`), so each flow styles
 * its own coach and this file ships no stylesheet.
 *
 * @param {Object} ui the orchestrator; used for fig.family and as uiHandler
 * @param {Object} opt
 * @param {String} opt.text the guidance message
 * @param {Object} opt.style viewport-space placement (see anchor.js)
 * @param {String} [opt.side] connector side
 * @param {Boolean} [opt.showBack] false in a phase with nothing to go back to
 * @param {Boolean} [opt.showNext]
 * @param {Boolean} [opt.nextDisabled] on screen but refusing the click
 * @param {String} opt.backService service fired by Back
 * @param {String} opt.nextService service fired by Next
 * @param {String} [opt.nextLabel] Next's wording. Defaults to the generic
 *   LOCALE.NEXT, but callers may pass their own key: reward-flow's
 *   REWARD_FLOW_NEXT is translated into languages where the generic one is
 *   still sitting at its English value, and moving it here would regress them.
 */
module.exports = function coach(
  ui,
  {
    text, style, side, showBack = true, showNext = false, nextDisabled = false,
    backService, nextService, nextLabel,
  },
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
          service: backService,
          uiHandler: [ui],
        }),
      );
    }
    // Only the read-only beats carry a Next: they are the sub-steps with no
    // real action to perform, so nothing else would ever advance them.
    if (showNext) {
      footerKids.push(
        Skeletons.Note({
          className: `${pfx}__coach-next`,
          // Disabled means it is on screen but refuses the click, for a beat
          // that is not ready to be left — the last upload beat, while files
          // are still going up. The service is withheld rather than filtered
          // later, so the click cannot reach the flow at all; the dataset
          // drives the look (see each flow's skin).
          dataset: { disabled: nextDisabled ? "1" : "0" },
          content: nextLabel || LOCALE.NEXT || "Next",
          ...(nextDisabled
            ? {}
            : { service: nextService, uiHandler: [ui] }),
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
