/**
 * Reward flow root — Figma frames 3275:236194 / 3275:236307 / 3275:236397.
 *
 * A fixed full-viewport layer. It has four visual modes, keyed off the root's
 * data-* attributes (see skin/index.scss):
 *
 *   terminal     (step "congrats" or "soldout")
 *     the vignette alone, inert, with the closing modal fed into the shared
 *     wrapper-modal on top of it.
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
const { baseStep, isWaiting, isGuiding } = require("../steps");

/**
 * The two terminal screens keep only the vignette. It must NOT stay guiding: that root sits at
 * z-index 1000000 against the wrapper-modal's 100000, and its
 * pointer-events:auto __guide-scrim would grey the confirmation out and swallow
 * its button. A plain root puts the vignette under the modal and over
 * everything else, and because the root is position:fixed and portaled to
 * document.body that dim is genuinely full-viewport — but only once
 * over-window lifts it clear of the open workspace (see the skin). The
 * wrapper-modal contributes no backdrop of its own here (index.js _openModal's
 * "bare" mode), so the dim stays one layer deep.
 *
 * No `service` on it: these are terminal states, so a click should do nothing
 * rather than raise "Don't drop now" — there is nothing left to drop out of.
 * That matters more for the sold-out notice than for congrats: a capped run
 * mounts straight into it, so the vignette is the FIRST thing the user meets,
 * and offering to talk them out of leaving a flow they were never given would
 * be nonsense.
 */
function terminalRoot(pfx, step) {
  return Skeletons.Box.Y({
    className: `${pfx}__root`,
    dataset: {
      // Kebab-case — see the note on the main root's dataset below.
      step, waiting: "0", guiding: "0", cutout: "0", "over-window": "1",
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
    dropHost(ui, pfx),
  ];
}

/**
 * Host for the "Don't drop now" modal, for the states that cannot use
 * Wm.__wrapperModal. It lives in the flow's own root, so opening it never
 * clobbers whatever occupies that wrapper-modal: the guided create-form /
 * permission panel during the walkthrough, and the invite popup on
 * step2_waiting — feeding it there would replace the popup and throw away the
 * emails the user has typed.
 *
 * Inert until the orchestrator feeds the drop modal into it (see
 * _openDropGuard).
 */
function dropHost(ui, pfx) {
  return Skeletons.Box.Y({
    className: `${pfx}__drop-modal`,
    sys_pn: "drop-modal",
    partHandler: ui,
  });
}

/**
 * Cutout over the step's topbar control (Invite on step 2, Upload on step 3),
 * positioned imperatively by _positionStepTarget. It replaces the old connector
 * arrow: the control reads clear, the rest stays dimmed — matching how Step 1's
 * walkthrough points at things.
 *
 * It also IS the click target for that control: the cutout is a transparent box
 * sitting exactly over the button (its box-shadow, which does the dimming,
 * isn't hit-testable), so firing the step's primary service here makes clicking
 * the spotlighted Upload/Invite button behave exactly like clicking the card's
 * primary button.
 *
 * Only on the ACTIVE step though: while waiting, the user is operating the real
 * invite popup / uploader, so the cutout keeps dimming and highlighting the
 * control but must not intercept its clicks.
 */
function targetCutout(ui, pfx, base, waiting) {
  return Skeletons.Box.Y({
    className: `${pfx}__cutout`,
    ...(waiting
      ? {}
      : {
        service: stepCard.primaryServiceFor(base, ui),
        uiHandler: [ui],
      }),
  });
}

/** A card state: vignette, the step's cutout when it has one, and the card. */
function cardKids(ui, pfx, { base, waiting, targeted, notarget }) {
  const kids = [
    Skeletons.Box.Y({
      className: `${pfx}__vignette`,
      // Only wired while a step is active; in waiting states CSS turns off
      // pointer events so this never fires.
      service: "reward-vignette-click",
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
    // which the invite popup owns. Rendered on every card state — it costs an
    // inert box and keeps the host in the markup wherever the orchestrator may
    // reach for it.
    dropHost(ui, pfx),
  );
  return kids;
}

module.exports = function (ui) {
  const pfx = ui.fig.family;
  const step = ui.getStep();

  if (step === "congrats" || step === "soldout") return terminalRoot(pfx, step);

  const waiting = isWaiting(step);
  // Both walkthroughs render the same way: cutout + scrim + coach, no card.
  // Step 1 walks the desk chrome, Step 3 the workspace window.
  const guiding = isGuiding(step);
  const base = baseStep(step);
  // Steps 2 and 3 point at a real topbar control, so they get a cutout over it.
  // Kept through the waiting state too, so the overlay and the card's position
  // don't change underneath the user the moment they start an upload — only the
  // cutout's interactivity does (see targetCutout and the stylesheet).
  // Two variants hang their card off no topbar control and are centred like
  // Step 1 (data-notarget, see skin __anchor):
  //   - a Step 2 served by the permission panel → the spotlight is the panel
  //     itself, a tall right-hand rail with nothing to hang a card under
  //   - a Step 3 with a workspace to reopen      → its card offers Open
  //     workspace, and the upload control it eventually points at lives INSIDE
  //     that workspace, not on the desk topbar.
  const panel = base === "step2" && ui.invitePanelOpen?.();
  const guided = base === "step3" && ui.hasStep1Workspace?.();
  const notarget = panel || guided;
  // Step 2 handed the user to a surface in the shared wrapper-modal — the
  // permission panel or the invite popup. Both need the root lifted clear of
  // that modal: it is the only way our dim reaches the topbar and sidebar (the
  // modal's own backdrop covers just the desk's wm-container, which is what
  // made the desk read darker than the chrome beside it), and the only way the
  // card lands above the dim rather than behind it.
  const onModal = base === "step2" && waiting;
  // The cutout is what dims: it clears one target and shadows everything else.
  // Steps 2/3 point it at their topbar control; the panel Step 2 points it at
  // the panel (_applyStepTarget), which is also how that state's dim reaches
  // the whole viewport instead of just the desk's wm-container.
  const targeted =
    panel || ((base === "step2" || base === "step3") && !notarget);

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
      // setAttribute(`data-${k}`) and does NOT convert (letc.js), so `overModal`
      // would land as `data-overmodal` — HTML lowercases attribute names — and
      // every `[data-over-modal]` rule in the skin would silently never match.
      //
      // The guided Step 3 card is the one card state reached with a workspace
      // WINDOW on screen (the user may have opened it, then pressed Back out of
      // the walkthrough). Windows outrank the flow's default layer, so this
      // asks the skin to lift the root clear of them.
      "over-window": guided ? "1" : "0",
      // Lift the root over the wrapper-modal holding this step's surface.
      "over-modal": onModal ? "1" : "0",
      // Only the permission-panel route: it alone gets the brand-filled Back,
      // being a card whose single control stands beside a full-height panel.
      "on-panel": panel ? "1" : "0",
      // …and step the card aside while the invite-sent confirmation stands in
      // that surface's place — either route's, the panel's or the popup's: it is
      // a card of its own, saying the same thing. Normally set imperatively (see
      // _markInviteToast); declared here too so a re-render while it is up does
      // not bring the card back.
      toast: onModal && ui.inviteToastOpen?.() ? "1" : "0",
    },
    debug: __filename,
    kids: guiding
      ? guideKids(ui, pfx)
      : cardKids(ui, pfx, { base, waiting, targeted, notarget }),
  });
};
