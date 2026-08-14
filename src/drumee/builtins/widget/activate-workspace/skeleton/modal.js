/**
 * The activation flow's closing card, fed into Wm.__wrapperModal, which supplies
 * the backdrop (flattened to the flow's own dim — see index.js _openModal).
 *
 * One modal, where there were two: the "Leave setup?" abandon guard lived here
 * until the flow became force-completed, and there is now no state in which it
 * offers a way out. The `shell` split it shared is kept — it is what stops these
 * screens growing a parallel `__modal-*` stylesheet — and `iconHeader` is passed
 * in rather than inlined for the same reason.
 *
 * Pure function of `ui` — it reads only fig.family and uses `ui` as the
 * uiHandler so clicks route back to the orchestrator.
 */

/** Shared modal shell: header → title → description → footer buttons.
 *  `header` is the top block — today always the closing card's status icon, but
 *  passed in rather than built here, which is what kept this shell generic when
 *  the abandon guard shared it.
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

/**
 * The closing card.
 *
 * Every step is done and the workspace has just been handed back at Home. The
 * copy congratulates rather than inventories: it deliberately does not list what
 * the user now has, because with Step 2 skippable that list is not the same for
 * every run — someone can arrive here having created a workspace and uploaded a
 * file but never invited anyone.
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
    title: LOCALE.ACTIVATE_WS_DONE_TITLE || "Congratulations!",
    body: Skeletons.Note({
      className: `${pfx}__desc`,
      content: LOCALE.ACTIVATE_WS_DONE_DESC
        || "You have activated your workspace. Welcome to drumee",
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

module.exports = { doneModal };
