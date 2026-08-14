/**
 * Activation flow root — a fixed full-viewport layer with four visual modes,
 * keyed off the root's data-* attributes (see skin/index.scss):
 *
 *   card     (data-waiting="0", data-guiding="0")
 *            the vignette is opaque and clickable — clicking it asks "Leave
 *            setup?" — and the step card sits on top.
 *   waiting  (data-waiting="1") the vignette fades to transparent and
 *            click-through so the user can reach the real invite popup or
 *            members panel; only the card stays interactive.
 *   guiding  (data-guiding="1") a rectangular cutout dims everything except the
 *            target (topbar button / dropdown item / form / permission panel /
 *            workspace control), which reads fully clear; the guide sizes it
 *            imperatively via the --cut-* vars. There is no card, just the
 *            coach-tooltip callout the guide feeds into `guide-callout`.
 *   terminal (step "done") the vignette alone, inert, with the closing modal
 *            fed into the shared wrapper-modal on top of it.
 */
const stepCard = require("./card");
const { baseStep, isWaiting, isGuiding } = require("../../../../libs/guided-flow/steps");

/**
 * Host for the "Leave setup?" guard.
 *
 * It lives in the flow's own root rather than Wm.__wrapperModal, so opening it
 * never clobbers what occupies that wrapper-modal — during the Step 1
 * walkthrough that is the create-workspace form, and on step2_waiting the invite
 * popup, where feeding the guard there would throw away the emails the user has
 * typed.
 *
 * Inert until the orchestrator feeds the modal into it (see _openDropGuard).
 */
function dropHost(ui, pfx) {
  return Skeletons.Box.Y({
    className: `${pfx}__drop-modal`,
    sys_pn: "drop-modal",
    partHandler: ui,
  });
}

/**
 * The terminal screen keeps only the vignette. It must NOT stay guiding: that
 * root sits at z-index 1000000 against the wrapper-modal's 100000, and its
 * pointer-events:auto __guide-scrim would grey the closing card out and swallow
 * its button. A plain root puts the vignette under the modal and over
 * everything else, and because the root is position:fixed and portaled to
 * document.body that dim is genuinely full-viewport. The wrapper-modal
 * contributes no backdrop of its own here (index.js _openModal's "bare" mode),
 * so the dim stays one layer deep.
 *
 * No `service` on it: this is a terminal state, so a click should do nothing
 * rather than raise a guard — there is nothing left to leave.
 */
function terminalRoot(pfx) {
  return Skeletons.Box.Y({
    className: `${pfx}__root`,
    dataset: {
      // Kebab-case — see the note on the main root's dataset below.
      step: "done", waiting: "0", guiding: "0", cutout: "0", "over-window": "1",
    },
    debug: __filename,
    kids: [Skeletons.Box.Y({ className: `${pfx}__vignette` })],
  });
}

/**
 * Either walkthrough. The rectangular cutout (a transparent box sized to the
 * target with a huge box-shadow) leaves the target clear and dims only the
 * rest. No card; the coach tooltip carries the step.
 */
function guideKids(ui, pfx) {
  return [
    Skeletons.Box.Y({ className: `${pfx}__cutout` }),
    // Clickable frame around the spotlight hole: clicking the dimmed area
    // (anywhere but the spotlighted target) asks "Leave setup?" — the same
    // guard the vignette gives the cards. The hole is punched with the same
    // --cut-* vars the cutout uses, so the target stays operable through it
    // while every other click is caught here.
    Skeletons.Box.Y({
      className: `${pfx}__guide-scrim`,
      service: "activate-vignette-click",
      uiHandler: [ui],
    }),
    Skeletons.Box.Y({
      className: `${pfx}__guide-callout`,
      sys_pn: "guide-callout",
      partHandler: ui,
    }),
    dropHost(ui, pfx),
  ];
}

/**
 * Cutout over the step's topbar control (Invite on Step 2), positioned
 * imperatively by _positionStepTarget.
 *
 * It also IS the click target for that control: the cutout is a transparent box
 * sitting exactly over the button (its box-shadow, which does the dimming, is
 * not hit-testable), so firing the step's primary service here makes clicking
 * the spotlighted Invite button behave exactly like clicking the card's button.
 *
 * Only on the ACTIVE step though: while waiting, the user is operating the real
 * popup or panel, so the cutout keeps dimming and highlighting the control but
 * must not intercept its clicks.
 */
function targetCutout(ui, pfx, base, waiting) {
  return Skeletons.Box.Y({
    className: `${pfx}__cutout`,
    ...(waiting
      ? {}
      : {
        service: stepCard.primaryServiceFor(base),
        uiHandler: [ui],
      }),
  });
}

/** A card state: vignette, the step's cutout when it has one, the card, and the
 *  guard's host. */
function cardKids(ui, pfx, { base, waiting, targeted, notarget }) {
  const kids = [
    Skeletons.Box.Y({
      className: `${pfx}__vignette`,
      // Only wired while a step is active; in waiting states CSS turns off
      // pointer events so this never fires.
      service: "activate-vignette-click",
      uiHandler: [ui],
    }),
  ];
  if (targeted) kids.push(targetCutout(ui, pfx, base, waiting));
  kids.push(
    Skeletons.Box.Y({
      className: `${pfx}__anchor`,
      dataset: { step: base, notarget: notarget ? "1" : "0" },
      kids: [stepCard(ui)],
    }),
    // step2_waiting raises its guard here rather than in the wrapper-modal,
    // which the invite surface owns. Rendered on every card state — it costs an
    // inert box and keeps the host in the markup wherever the orchestrator may
    // reach for it.
    dropHost(ui, pfx),
  );
  return kids;
}

module.exports = function (ui) {
  const pfx = ui.fig.family;
  const step = ui.getStep();

  if (step === "done") return terminalRoot(pfx);

  const waiting = isWaiting(step);
  // Both walkthroughs render the same way: cutout + scrim + coach, no card.
  // Step 1 walks the desk chrome, Step 3 the workspace window.
  const guiding = isGuiding(step);
  const base = baseStep(step);
  // Step 2 points at a real topbar control, so it gets a cutout over it. Kept
  // through the waiting state too, so the overlay and the card's position don't
  // change underneath the user the moment the popup opens — only the cutout's
  // interactivity does (see targetCutout and the stylesheet).
  //
  // Two variants hang their card off no topbar control and are centred like
  // Step 1 (data-notarget, see skin __anchor):
  //   - a Step 2 served by the permission panel → the spotlight is the panel
  //     itself, a tall right-hand rail with nothing to hang a card under
  //   - Step 3, whose card opens the workspace and whose upload control lives
  //     INSIDE it, not on the desk topbar
  const panel = base === "step2" && ui.invitePanelOpen?.();
  const notarget = panel || base === "step3";
  // Step 2 handed the user to a surface in the shared wrapper-modal — the
  // permission panel or the invite popup. Both need the root lifted clear of
  // that modal: it is the only way our dim reaches the topbar and sidebar (the
  // modal's own backdrop covers just the desk's wm-container, which is what
  // makes the desk read darker than the chrome beside it), and the only way the
  // card lands above the dim rather than behind it.
  const onModal = base === "step2" && waiting;
  // The cutout is what dims: it clears one target and shadows everything else.
  // Step 2 points it at its topbar control; the panel Step 2 points it at the
  // panel (_applyStepTarget), which is also how that state's dim reaches the
  // whole viewport instead of just the desk's wm-container.
  const targeted = panel || (base === "step2" && !notarget);

  return Skeletons.Box.Y({
    className: `${pfx}__root`,
    dataset: {
      step,
      waiting: waiting ? "1" : "0",
      guiding: guiding ? "1" : "0",
      // Tells the stylesheet the cutout is doing the dimming, so the flat
      // vignette must go transparent (it stays for the drop-modal click).
      cutout: targeted ? "1" : "0",
      // KEBAB-CASE, not camelCase: the framework writes these with
      // setAttribute(`data-${k}`) and does NOT convert (letc.js), so
      // `overModal` would land as `data-overmodal` — HTML lowercases attribute
      // names — and every `[data-over-modal]` rule in the skin would silently
      // never match.
      //
      // The Step 3 card is the one card state reached with a workspace WINDOW
      // possibly on screen: the user may have opened it and then pressed Back
      // out of the walkthrough. Windows outrank the flow's default layer, so
      // this asks the skin to lift the root clear of them.
      "over-window": base === "step3" && ui.hasWorkspace?.() ? "1" : "0",
      // Lift the root over the wrapper-modal holding this step's surface.
      "over-modal": onModal ? "1" : "0",
      // Only the permission-panel route: it alone gets the brand-filled Back,
      // being a card whose controls stand beside a full-height panel.
      "on-panel": panel ? "1" : "0",
      // …and step the card aside while the invite-sent confirmation stands in
      // that surface's place — either route's, the panel's or the popup's: it is
      // a card of its own, saying the same thing. Normally set imperatively (see
      // markInviteToast); declared here too so a re-render while it is up does
      // not bring the card back.
      toast: onModal && ui.inviteToastOpen?.() ? "1" : "0",
    },
    debug: __filename,
    kids: guiding
      ? guideKids(ui, pfx)
      : cardKids(ui, pfx, { base, waiting, targeted, notarget }),
  });
};
