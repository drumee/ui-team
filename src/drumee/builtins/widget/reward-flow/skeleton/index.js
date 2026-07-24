/**
 * Reward flow root — Figma frames 3275:236194 / 3275:236307 / 3275:236397.
 *
 * A fixed full-viewport layer. It has three visual modes, keyed off the root's
 * data-* attributes (see skin/index.scss):
 *
 *   active step  (data-waiting="0", data-guiding="0")
 *     the vignette is opaque and clickable — clicking it asks "Don't drop now"
 *     — and the step card sits on top.
 *   waiting      (data-waiting="1")
 *     the vignette fades to transparent and click-through so the user can reach
 *     the real uploader / invite popup; only the card stays interactive.
 *   guiding      (data-guiding="1", Step 1's live-desk walkthrough)
 *     the vignette becomes a spotlight cutout (positioned imperatively by the
 *     guide via --spot-* vars) and click-through; there is no card, just the
 *     coach-tooltip callout the guide feeds into `guide-callout`.
 */
const stepCard = require("./card");

module.exports = function (ui) {
  const pfx = ui.fig.family;
  const step = ui.getStep();
  const waiting = step.endsWith("_waiting");
  const guiding = step === "step1_guide";

  const kids = [
    Skeletons.Box.Y({
      className: `${pfx}__vignette`,
      // Only wired while a step is active; in waiting/guiding states CSS turns
      // off pointer events so this never fires.
      service: "reward-vignette-click",
      uiHandler: [ui],
    }),
  ];

  if (guiding) {
    // No card while guiding — the spotlight + coach tooltip carry the step.
    kids.push(
      Skeletons.Box.Y({
        className: `${pfx}__guide-callout`,
        sys_pn: "guide-callout",
        partHandler: ui,
      }),
    );
  } else {
    kids.push(
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
    );
  }

  return Skeletons.Box.Y({
    className: `${pfx}__root`,
    dataset: { step, waiting: waiting ? "1" : "0", guiding: guiding ? "1" : "0" },
    debug: __filename,
    kids,
  });
};
