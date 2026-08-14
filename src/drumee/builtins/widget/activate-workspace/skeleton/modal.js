/**
 * Activation flow modals. Both are fed into Wm.__wrapperModal, which supplies
 * the backdrop (flattened to the flow's own dim — see index.js _openModal).
 *
 * Pure functions of `ui` — they read only fig.family and use `ui` as the
 * uiHandler so clicks route back to the orchestrator.
 */

/** Shared modal shell: header → title → description → footer buttons.
 *  `header` is the top block: either the branded drumee logo (the guard) or a
 *  single status icon (the closing card). Passing it pre-built keeps this shell
 *  generic.
 *
 *  It IS a step card — same `__card` class, same `__title` / `__desc` /
 *  `__footer` inside. These are the last screens of the flow the cards run, so
 *  they take the card's shell, type scale and buttons by reusing them rather
 *  than by a parallel `__modal-*` stylesheet somebody has to keep in sync.
 *  `__modal` adds only what being fed OUTSIDE the flow root requires (its own
 *  font, and pointer events back on). */
function shell(ui, { header, title, body, footer }) {
  const pfx = ui.fig.family;
  return Skeletons.Box.Y({
    className: `${pfx}__card ${pfx}__modal`,
    kids: [
      header,
      Skeletons.Note({ className: `${pfx}__title`, content: title }),
      body,
      Skeletons.Box.X({ className: `${pfx}__footer`, kids: footer }),
    ],
  });
}

/** A single status icon (the closing card's success check), in the card's chip. */
function iconHeader(ui, { ico, icoClass }) {
  const pfx = ui.fig.family;
  return Skeletons.Box.Y({
    className: `${pfx}__chip ${icoClass}`,
    kids: [Skeletons.Image.Svg({ className: `${pfx}__chip-ico`, ico })],
  });
}

/** Branded drumee logo + wordmark — same lockup as the coach header. */
function brandHeader(ui) {
  const pfx = ui.fig.family;
  return Skeletons.Box.X({
    className: `${pfx}__modal-brand`,
    kids: [
      Skeletons.Image.Svg({ className: `${pfx}__modal-brand-logo`, ico: "logo-upload" }),
      Skeletons.Note({ className: `${pfx}__modal-brand-name`, content: "drumee" }),
    ],
  });
}

/**
 * The abandon guard, raised by a click on the dimmed backdrop.
 *
 * It asks rather than assumes, because that click is as often a miss as a
 * decision — the walkthrough covers the screen, and the thing the user meant to
 * press is frequently just outside the hole. What it must not do is plead:
 * there is no prize here to talk anyone out of forfeiting, so it states what
 * leaving costs (the walkthrough, nothing else) and lets them go.
 */
function dropModal(ui) {
  const pfx = ui.fig.family;
  return shell(ui, {
    header: brandHeader(ui),
    title: LOCALE.ACTIVATE_WS_DROP_TITLE || "Leave setup?",
    body: Skeletons.Note({
      className: `${pfx}__desc`,
      content: LOCALE.ACTIVATE_WS_DROP_DESC
        || "You can set your workspace up later, but this walkthrough won't come back.",
    }),
    footer: [
      Skeletons.Note({
        className: `${pfx}__btn ${pfx}__btn--ghost`,
        content: LOCALE.ACTIVATE_WS_DROP_LEAVE || "Leave setup",
        service: "activate-drop-leave",
        uiHandler: [ui],
      }),
      Skeletons.Note({
        className: `${pfx}__btn ${pfx}__btn--primary`,
        content: LOCALE.ACTIVATE_WS_CONTINUE || "Continue",
        service: "activate-drop-stay",
        uiHandler: [ui],
      }),
    ],
  });
}

/**
 * The closing card.
 *
 * Both steps are done and the workspace has just been handed back at Home, so
 * this is the moment to say what the user now has rather than to congratulate
 * them on finishing a walkthrough. Nothing was granted or claimed here — the
 * workspace and the file are the whole outcome — so the copy points at those
 * and gets out of the way.
 */
function doneModal(ui) {
  const pfx = ui.fig.family;
  return shell(ui, {
    // A green outline check-circle on a soft-green ground. checked-circle.svg
    // is that outline glyph (apps-check-circle is a filled disc that reads as a
    // dark blob at this size). The ground is the step card's own chip, tinted
    // green.
    header: iconHeader(ui, {
      ico: "checked-circle",
      icoClass: `${pfx}__chip--success`,
    }),
    title: LOCALE.ACTIVATE_WS_DONE_TITLE || "Your workspace is ready",
    body: Skeletons.Note({
      className: `${pfx}__desc`,
      content: LOCALE.ACTIVATE_WS_DONE_DESC
        || "Your first file is safe in your workspace. Invite your team whenever you're ready.",
    }),
    footer: [
      Skeletons.Note({
        className: `${pfx}__btn ${pfx}__btn--primary`,
        dataset: { solo: "1" },
        content: LOCALE.ACTIVATE_WS_DONE_CTA || "Back to home",
        service: "activate-finish",
        uiHandler: [ui],
      }),
    ],
  });
}

module.exports = { dropModal, doneModal };
