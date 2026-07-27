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
  const { baseStep, isWaiting, isGuiding } = require("../steps");
  const step = ui.getStep();

  // Congrats keeps only the vignette. It must NOT stay guiding: that root sits
  // at z-index 1000000 against the wrapper-modal's 100000, and its
  // pointer-events:auto __guide-scrim would grey the confirmation out and
  // swallow its button. A plain root puts the vignette under the modal and over
  // everything else, and because the root is position:fixed and portaled to
  // document.body that dim is genuinely full-viewport — but only once
  // over-window lifts it clear of the open workspace (see the skin). The
  // wrapper-modal contributes no backdrop of its own here (index.js
  // _openModal's "bare" mode), so the dim stays one layer deep.
  //
  // No `service` on it: this is a terminal state, so a click should do nothing
  // rather than raise "Don't drop now".
  if (step === "congrats") {
    return Skeletons.Box.Y({
      className: `${pfx}__root`,
      dataset: {
        step, waiting: "0", guiding: "0", cutout: "0", overWindow: "1",
      },
      debug: __filename,
      kids: [Skeletons.Box.Y({ className: `${pfx}__vignette` })],
    });
  }

  const waiting = isWaiting(step);
  // Both walkthroughs render the same way: cutout + scrim + coach, no card.
  // Step 1 walks the desk chrome, Step 3 the workspace window.
  const guiding = isGuiding(step);
  const base = baseStep(step);
  // Steps 2 and 3 point at a real topbar control, so they get a cutout over it.
  // Kept through the waiting state too, so the overlay and the card's position
  // don't change underneath the user the moment they start an upload — only the
  // cutout's interactivity does (see below and the stylesheet).
  // Two variants point at no topbar control at all and are centred like Step 1
  // (data-notarget, see skin __anchor):
  //   - a Step 2 already satisfied during Step 1 → its card offers Continue
  //   - a Step 3 with a workspace to reopen      → its card offers Open
  //     workspace, and the upload control it eventually points at lives INSIDE
  //     that workspace, not on the desk topbar.
  const satisfied = base === "step2" && ui.inviteSatisfied && ui.inviteSatisfied();
  const guided = base === "step3" && ui.hasStep1Workspace && ui.hasStep1Workspace();
  const notarget = satisfied || guided;
  const targeted = (base === "step2" || base === "step3") && !notarget;

  const kids = [];

  if (guiding) {
    // Guiding uses the rectangular cutout for every sub-step (a transparent box
    // sized to the target with a huge box-shadow) — the target reads clear and
    // only the rest is dimmed. No card; the coach tooltip carries the step.
    kids.push(
      Skeletons.Box.Y({ className: `${pfx}__cutout` }),
      // Clickable frame around the spotlight hole: clicking the dimmed area
      // (anywhere but the spotlighted target) asks "Don't drop now" — the same
      // abandon-guard the vignette gives steps 2/3. The hole is punched with the
      // same --cut-* vars the cutout uses, so the target stays operable through
      // it while every other click is caught here.
      Skeletons.Box.Y({
        className: `${pfx}__guide-scrim`,
        service: "reward-vignette-click",
        uiHandler: [ui],
      }),
      Skeletons.Box.Y({
        className: `${pfx}__guide-callout`,
        sys_pn: "guide-callout",
        partHandler: ui,
      }),
      // Host for the "Don't drop now" modal DURING the walkthrough. It lives in
      // the flow's own root — not Wm.__wrapperModal — so opening it never
      // clobbers the guided create-form / permission panel that occupy that
      // wrapper-modal on the form/perm sub-steps. Inert until the orchestrator
      // feeds the drop modal into it (see _openGuideDrop).
      Skeletons.Box.Y({
        className: `${pfx}__guide-modal`,
        sys_pn: "guide-modal",
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
      // Cutout over the step's topbar control (Invite on step 2, Upload on
      // step 3), positioned imperatively by _positionStepTarget. It replaces
      // the old connector arrow: the control reads clear, the rest stays
      // dimmed — matching how Step 1's walkthrough points at things.
      //
      // It also IS the click target for that control: the cutout is a
      // transparent box sitting exactly over the button (its box-shadow, which
      // does the dimming, isn't hit-testable), so firing the step's primary
      // service here makes clicking the spotlighted Upload/Invite button behave
      // exactly like clicking the card's primary button.
      //
      // Only on the ACTIVE step though: while waiting, the user is operating
      // the real invite popup / uploader, so the cutout keeps dimming and
      // highlighting the control but must not intercept its clicks.
      kids.push(
        Skeletons.Box.Y({
          className: `${pfx}__cutout`,
          ...(waiting
            ? {}
            : {
              service: stepCard.primaryServiceFor(base, ui),
              uiHandler: [ui],
            }),
        }),
      );
    }
    kids.push(
      Skeletons.Box.Y({
        className: `${pfx}__anchor`,
        dataset: { step: base, notarget: notarget ? "1" : "0" },
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
      // The guided Step 3 card is the one card state reached with a workspace
      // WINDOW on screen (the user may have opened it, then pressed Back out of
      // the walkthrough). Windows outrank the flow's default layer, so this
      // asks the skin to lift the root clear of them.
      overWindow: guided ? "1" : "0",
    },
    debug: __filename,
    kids,
  });
};
