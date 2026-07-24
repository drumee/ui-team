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
  const base = waiting ? step.replace("_waiting", "") : step;
  // Steps 2 and 3 point at a real topbar control, so they get a cutout over it.
  // Not while waiting: there the user is operating the real UI and nothing
  // should be dimmed.
  const targeted = !waiting && (base === "step2" || base === "step3");

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
    );
    if (targeted) {
      // Cutout over the step's topbar control (Upload on step 2, Invite on
      // step 3), positioned imperatively by _positionStepTarget. It replaces
      // the old connector arrow: the control reads clear, the rest stays
      // dimmed — matching how Step 1's walkthrough points at things.
      kids.push(Skeletons.Box.Y({ className: `${pfx}__cutout` }));
    }
    kids.push(
      Skeletons.Box.Y({
        className: `${pfx}__anchor`,
        dataset: { step: base },
        kids: [stepCard(ui)],
      }),
    );
  }

  return Skeletons.Box.Y({
    className: `${pfx}__root`,
    dataset: {
      step,
      waiting: waiting ? "1" : "0",
      guiding: guiding ? "1" : "0",
      // Tells the stylesheet the cutout is doing the dimming, so the flat
      // vignette must go transparent (it stays for the drop-modal click).
      cutout: targeted ? "1" : "0",
    },
    debug: __filename,
    kids,
  });
};
