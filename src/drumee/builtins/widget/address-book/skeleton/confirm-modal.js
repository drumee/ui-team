// Destructive-action confirmation dialog.
//
// Delete, Archive and Cancel-invite used to fire straight from the list row /
// detail footer, so a mis-tap on a hover action was irreversible (Delete is a
// hard delete server-side — `contact.delete_contact` has no trash and no
// restore). Every one of those actions now routes through this dialog first.
//
// Same backdrop/modal shell as invite-modal.js and import-modal.js so there is
// one dialog language in this widget; only the copy and the confirm button
// change per action.

// Per-action copy + the styling of the confirm button. `danger` gets a solid
// red confirm; archive is reversible, so it keeps the neutral primary.
const COPY = {
  delete: {
    title: () => LOCALE.DELETE_CONTACT_Q,
    body: () => LOCALE.DELETE_CONTACT_IRREVERSIBLE,
    confirm: () => LOCALE.DELETE,
    kind: "danger-solid",
  },
  archive: {
    title: () => LOCALE.ARCHIVE_CONTACT_Q,
    body: () => LOCALE.ARCHIVE_CONTACT_RESTORABLE,
    confirm: () => LOCALE.ARCHIVE,
    kind: "primary",
  },
  "cancel-invite": {
    title: () => LOCALE.CANCEL_INVITE_Q,
    body: () => LOCALE.CANCEL_INVITE_WITHDRAWN,
    confirm: () => LOCALE.CANCEL_INVITE,
    kind: "danger-solid",
  },
};

module.exports = function (ui) {
  const fig = ui.fig.family;
  const pending = ui.getPendingConfirm();
  if (!pending) return null;

  const copy = COPY[pending.kind] || COPY.delete;
  const busy = ui.isConfirmBusy();

  // "Cancel" is the dismiss label everywhere except the cancel-invite dialog,
  // where "Cancel / Cancel invitation" would read as two of the same thing.
  const dismissLabel =
    pending.kind === "cancel-invite" ? LOCALE.BACK : LOCALE.CANCEL;

  return Skeletons.Box.Y({
    className: `${fig}__modal-backdrop`,
    bubble: 0,
    // A click outside the dialog is a dismissal — but not while the action is
    // already in flight, or the dialog would vanish mid-request.
    service: busy ? null : "confirm-dismiss",
    uiHandler: [ui],
    kids: [
      Skeletons.Box.Y({
        className: `${fig}__modal ${fig}__modal--confirm`,
        bubble: 0,
        kids: [
          Skeletons.Box.Y({
            className: `${fig}__modal-form`,
            // `attrOpt`, not `dataset`: ui-core only merges a skeleton
            // `dataset` onto the element when `attribute`/`attrOpt` is present
            // too, so a lone `dataset` renders no data-* at all and the
            // [data-submitting="1"] / [data-disabled="1"] rules never match.
            attrOpt: busy ? { "data-submitting": "1" } : undefined,
            kids: [
              Skeletons.Box.X({
                className: `${fig}__modal-header`,
                kids: [
                  Skeletons.Note({
                    className: `${fig}__modal-title`,
                    content: copy.title(),
                  }),
                  Skeletons.Button.Svg({
                    className: `${fig}__modal-close`,
                    ico: "cross",
                    bubble: 0,
                    service: busy ? null : "confirm-dismiss",
                    // No `state` prop: it would install toggle behavior on a
                    // button that only ever closes the dialog.
                    attrOpt: busy ? { "data-disabled": "1" } : undefined,
                    uiHandler: [ui],
                  }),
                ],
              }),

              Skeletons.Note({
                className: `${fig}__confirm-body`,
                content: copy.body(),
              }),

              Skeletons.Box.X({
                className: `${fig}__modal-actions`,
                kids: [
                  Skeletons.Note({
                    className: `${fig}__btn ${fig}__btn--secondary`,
                    content: dismissLabel,
                    bubble: 0,
                    service: busy ? null : "confirm-dismiss",
                    attrOpt: busy ? { "data-disabled": "1" } : undefined,
                    uiHandler: [ui],
                  }),
                  Skeletons.Note({
                    className: `${fig}__btn ${fig}__btn--${copy.kind}`,
                    content: copy.confirm(),
                    bubble: 0,
                    service: busy ? null : "confirm-proceed",
                    attrOpt: busy
                      ? { "data-disabled": "1", "data-loading": "1" }
                      : undefined,
                    uiHandler: [ui],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
};
