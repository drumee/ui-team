/**
 * Reward flow root — Figma frames 3275:236194 / 3275:236307 / 3275:236397.
 *
 * A fixed full-viewport layer hosting the step card. During the active steps
 * the vignette is opaque and clickable (clicking it asks "Don't drop now").
 * During the `*_waiting` states it is transparent and click-through, so the
 * user can reach the real uploader and the real invite popup underneath —
 * only the card itself stays interactive. That switch is driven purely by the
 * data-waiting attribute; see skin/index.scss.
 */
const stepCard = require("./card");

module.exports = function (ui) {
  const pfx = ui.fig.family;
  const step = ui.getStep();
  const waiting = step.endsWith("_waiting");

  return Skeletons.Box.Y({
    className: `${pfx}__root`,
    dataset: { step, waiting: waiting ? "1" : "0" },
    debug: __filename,
    kids: [
      Skeletons.Box.Y({
        className: `${pfx}__vignette`,
        // Only wired while a step is active; in waiting states CSS turns off
        // pointer events so this never fires.
        service: "reward-vignette-click",
        uiHandler: [ui],
      }),
      Skeletons.Box.Y({
        className: `${pfx}__anchor`,
        dataset: { step: waiting ? step.replace("_waiting", "") : step },
        kids: [
          // The connector arrow points at the step's target control: the
          // topbar upload button on step 2, the invite control on step 3.
          // Step 1 is centred and has no target.
          step.startsWith("step1")
            ? null
            : Skeletons.Box.Y({ className: `${pfx}__arrow` }),
          stepCard(ui),
        ].filter(Boolean),
      }),
    ],
  });
};
