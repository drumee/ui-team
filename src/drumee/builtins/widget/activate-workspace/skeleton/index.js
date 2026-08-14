/**
 * Activation flow root — a fixed full-viewport layer with three visual modes,
 * keyed off the root's data-* attributes (see skin/index.scss):
 *
 *   card     the vignette is opaque and clickable — clicking it asks "Leave
 *            setup?" — and the step card sits centred on top.
 *   guiding  (data-guiding="1") a rectangular cutout dims everything except the
 *            target (topbar button / dropdown item / form / permission panel /
 *            workspace control), which reads fully clear; the guide sizes it
 *            imperatively via the --cut-* vars. There is no card, just the
 *            coach-tooltip callout the guide feeds into `guide-callout`.
 *   terminal (step "done") the vignette alone, inert, with the closing modal
 *            fed into the shared wrapper-modal on top of it.
 *
 * Both cards are CENTRED. reward-flow anchors two of its three under the topbar
 * control they point at, and carries a whole measuring apparatus to keep them
 * there; neither card here points at a topbar control — Step 1's action is
 * "start the walkthrough" and Step 2's is "open the workspace" — so there is
 * nothing to measure and none of that apparatus exists.
 */
const stepCard = require("./card");
const { isGuiding } = require("../../../../libs/guided-flow/steps");

/**
 * Host for the "Leave setup?" guard.
 *
 * It lives in the flow's own root rather than Wm.__wrapperModal, so opening it
 * never clobbers what occupies that wrapper-modal — during the Step 1
 * walkthrough that is the create-workspace form, and feeding the guard there
 * would throw away the name the user has typed.
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
      step: "done", guiding: "0", "over-window": "1",
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

/** A card state: the vignette that dims and catches the abandon click, the
 *  centred card, and the guard's host. */
function cardKids(ui, pfx) {
  return [
    Skeletons.Box.Y({
      className: `${pfx}__vignette`,
      service: "activate-vignette-click",
      uiHandler: [ui],
    }),
    Skeletons.Box.Y({
      className: `${pfx}__anchor`,
      kids: [stepCard(ui)],
    }),
    dropHost(ui, pfx),
  ];
}

module.exports = function (ui) {
  const pfx = ui.fig.family;
  const step = ui.getStep();

  if (step === "done") return terminalRoot(pfx);

  // Both walkthroughs render the same way: cutout + scrim + coach, no card.
  // Step 1 walks the desk chrome, Step 2 the workspace window.
  const guiding = isGuiding(step);

  return Skeletons.Box.Y({
    className: `${pfx}__root`,
    dataset: {
      step,
      guiding: guiding ? "1" : "0",
      // KEBAB-CASE, not camelCase: the framework writes these with
      // setAttribute(`data-${k}`) and does NOT convert (letc.js), so
      // `overWindow` would land as `data-overwindow` — HTML lowercases
      // attribute names — and every `[data-over-window]` rule in the skin would
      // silently never match.
      //
      // The Step 2 card is the one card state reached with a workspace WINDOW
      // possibly on screen: the user may have opened it and then pressed Back
      // out of the walkthrough. Windows outrank the flow's default layer, so
      // this asks the skin to lift the root clear of them.
      "over-window": ui.hasWorkspace?.() ? "1" : "0",
    },
    debug: __filename,
    kids: guiding ? guideKids(ui, pfx) : cardKids(ui, pfx),
  });
};
