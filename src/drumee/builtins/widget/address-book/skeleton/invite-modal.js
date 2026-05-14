module.exports = function (ui) {
  const fig = ui.fig.family;
  const draft = ui.getInviteDraft();
  const error = ui.getInviteError();
  const submitting = ui.isInviteSubmitting();

  return Skeletons.Box.Y({
    className: `${fig}__modal-backdrop`,
    bubble: 0,
    service: submitting ? null : "cancel-invite",
    uiHandler: [ui],
    kids: [
      Skeletons.Box.Y({
        className: `${fig}__modal`,
        bubble: 0,
        kids: [
          Skeletons.Box.Y({
            className: `${fig}__modal-form`,
            dataset: submitting ? { submitting: 1 } : undefined,
            kids: [
              Skeletons.Box.X({
                className: `${fig}__modal-header`,
                kids: [
                  Skeletons.Note({
                    className: `${fig}__modal-title`,
                    content: LOCALE.ADD_CONTACTS,
                  }),
                  Skeletons.Button.Svg({
                    className: `${fig}__modal-close`,
                    ico: "cross",
                    bubble: 0,
                    service: submitting ? null : "cancel-invite",
                    state: submitting ? 0 : 1,
                    dataset: submitting ? { disabled: 1 } : undefined,
                    uiHandler: [ui],
                  }),
                ],
              }),
              error
                ? Skeletons.Note({
                    className: `${fig}__modal-error`,
                    content: error,
                  })
                : null,
              Skeletons.Box.Y({
                className: `${fig}__modal-field`,
                kids: [
                  Skeletons.Note({
                    className: `${fig}__modal-label`,
                    content: LOCALE.EMAIL,
                  }),
                  Skeletons.Entry({
                    className: `${fig}__modal-input`,
                    formItem: "email",
                    value: draft.email || "",
                    placeholder: LOCALE.EMAIL_ADDRESS,
                    require: "email",
                    autofocus: 1,
                    preselect: 1,
                    bubble: 0,
                    dataset: submitting ? { disabled: 1 } : undefined,
                    uiHandler: [ui],
                  }),
                ],
              }),
              Skeletons.Box.Y({
                className: `${fig}__modal-field`,
                kids: [
                  Skeletons.Note({
                    className: `${fig}__modal-label`,
                    content: LOCALE.MESSAGE,
                  }),
                  Skeletons.Textarea({
                    className: `${fig}__modal-textarea`,
                    formItem: "message",
                    value: draft.message || "",
                    placeholder: LOCALE.WRITE_A_MESSAGE,
                    require: "any",
                    rows: 3,
                    ignoreEnter: true,
                    bubble: 0,
                    dataset: submitting ? { disabled: 1 } : undefined,
                  }),
                ],
              }),
              Skeletons.Box.X({
                className: `${fig}__modal-actions`,
                kids: [
                  Skeletons.Note({
                    className: `${fig}__btn ${fig}__btn--secondary`,
                    content: LOCALE.CANCEL,
                    bubble: 0,
                    service: submitting ? null : "cancel-invite",
                    state: submitting ? 0 : 1,
                    dataset: submitting ? { disabled: 1 } : undefined,
                    uiHandler: [ui],
                  }),
                  Skeletons.Note({
                    className: `${fig}__btn ${fig}__btn--primary`,
                    content: submitting ? LOCALE.SENDING : LOCALE.INVITE,
                    bubble: 0,
                    service: submitting ? null : "submit-invite",
                    state: submitting ? 0 : 1,
                    dataset: submitting ? { disabled: 1, loading: 1 } : undefined,
                    uiHandler: [ui],
                  }),
                ],
              }),
            ].filter(Boolean),
          }),
        ],
      }),
    ],
  });
};
