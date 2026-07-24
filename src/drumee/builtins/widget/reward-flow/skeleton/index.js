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
 *     a rectangular cutout dims everything except the target (topbar button /
 *     dropdown item / form / permission panel), which reads fully clear; the
 *     guide sizes it imperatively via the --cut-* vars. There is no card, just
 *     the coach-tooltip callout the guide feeds into `guide-callout`.
 */
const stepCard = require("./card");

module.exports = function (ui) {
  const pfx = ui.fig.family;
  const step = ui.getStep();
  const waiting = step.endsWith("_waiting");
  const guiding = step === "step1_guide";

  const kids = [];

  if (guiding) {
    // Guiding uses the rectangular cutout for every sub-step (a transparent box
    // sized to the target with a huge box-shadow) — the target reads clear and
    // only the rest is dimmed. No card; the coach tooltip carries the step.
    kids.push(
      Skeletons.Box.Y({ className: `${pfx}__cutout` }),
      Skeletons.Box.Y({
        className: `${pfx}__guide-callout`,
        sys_pn: "guide-callout",
        partHandler: ui,
      }),
    );
  } else {
    kids.push(
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
    );
  }

  return Skeletons.Box.Y({
    className: `${pfx}__root`,
    dataset: { step, waiting: waiting ? "1" : "0", guiding: guiding ? "1" : "0" },
    debug: __filename,
    kids,
  });
};
