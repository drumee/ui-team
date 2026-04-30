function passwordField(ui, opt) {
  const pfx = `${ui.fig.family}__field`;
  const { label, name, fieldKey, value = "" } = opt;
  const visible = ui._show[fieldKey];
  return Skeletons.Box.Y({
    className: pfx,
    kids: [
      Skeletons.Note({
        className: `${pfx}-label`,
        content: label,
      }),
      Skeletons.Box.X({
        className: `${pfx}-input`,
        kids: [
          Skeletons.Entry({
            className: `${pfx}-entry`,
            placeholder: "••••••••••••",
            name,
            type: visible ? "text" : "password",
            value,
            uiHandler: [ui],
          }),
          Skeletons.Button.Svg({
            ico: visible ? "eye_closed" : "eye",
            className: `${pfx}-toggle`,
            service: `change-password-toggle-${fieldKey}`,
            uiHandler: [ui],
          }),
        ],
      }),
    ],
  });
}

function formView(ui) {
  const pfx = ui.fig.family;
  const submitting = ui._submitting;

  const header = Skeletons.Box.Y({
    className: `${pfx}__header`,
    kids: [
      Skeletons.Note({
        className: `${pfx}__title`,
        content: LOCALE.CHANGE_PASSWORD,
      }),
      Skeletons.Note({
        className: `${pfx}__subtitle`,
        content: LOCALE.CHANGE_PASSWORD_HINT,
      }),
    ],
  });

  const fields = Skeletons.Box.Y({
    className: `${pfx}__fields`,
    kids: [
      passwordField(ui, {
        label: LOCALE.CURRENT_PASSWORD_LABEL,
        name: "current_password",
        fieldKey: "current",
        value: ui._values.current,
      }),
      passwordField(ui, {
        label: LOCALE.NEW_PASSWORD_LABEL,
        name: "new_password",
        fieldKey: "new",
        value: ui._values.next,
      }),
      passwordField(ui, {
        label: LOCALE.CONFIRM_PASSWORD_LABEL,
        name: "confirm_password",
        fieldKey: "confirm",
        value: ui._values.confirm,
      }),
      ui._error
        ? Skeletons.Note({
            className: `${pfx}__error`,
            content: ui._error,
          })
        : null,
    ].filter(Boolean),
  });

  const footer = Skeletons.Box.X({
    className: `${pfx}__footer`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__btn ${pfx}__btn--cancel`,
        service: "change-password-cancel",
        uiHandler: [ui],
        kids: [
          Skeletons.Note({
            className: `${pfx}__btn-label`,
            content: LOCALE.CANCEL,
          }),
        ],
      }),
      Skeletons.Box.X({
        className: `${pfx}__btn ${pfx}__btn--primary${
          submitting ? " is-loading" : ""
        }`,
        service: submitting ? null : "change-password-submit",
        uiHandler: [ui],
        kids: [
          Skeletons.Note({
            className: `${pfx}__btn-label`,
            content: submitting ? LOCALE.UPDATING : LOCALE.UPDATE_PASSWORD,
          }),
        ],
      }),
    ],
  });

  return Skeletons.Box.Y({
    className: `${pfx}__modal ${pfx}__modal--form`,
    kids: [header, fields, footer],
  });
}

function successView(ui) {
  const pfx = ui.fig.family;

  const icon = Skeletons.Box.X({
    className: `${pfx}__success-ico-wrap`,
    kids: [
      Skeletons.Image.Svg({
        ico: "checked-circle",
        className: `${pfx}__success-ico`,
      }),
    ],
  });

  const title = Skeletons.Note({
    className: `${pfx}__title ${pfx}__title--success`,
    content: LOCALE.PASSWORD_UPDATED,
  });

  const description = Skeletons.Note({
    className: `${pfx}__success-description`,
    content: LOCALE.PASSWORD_UPDATED_DESC,
  });

  const header = Skeletons.Box.Y({
    className: `${pfx}__header ${pfx}__header--success`,
    kids: [
      Skeletons.Box.Y({
        className: `${pfx}__success-stack`,
        kids: [icon, title],
      }),
      description,
    ],
  });

  const footer = Skeletons.Box.X({
    className: `${pfx}__footer ${pfx}__footer--success`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__btn ${pfx}__btn--primary ${pfx}__btn--full`,
        service: "change-password-done",
        uiHandler: [ui],
        kids: [
          Skeletons.Note({
            className: `${pfx}__btn-label`,
            content: LOCALE.DONE,
          }),
        ],
      }),
    ],
  });

  return Skeletons.Box.Y({
    className: `${pfx}__modal ${pfx}__modal--success`,
    kids: [header, footer],
  });
}

function changePasswordRoot(ui) {
  return ui._step === "success" ? successView(ui) : formView(ui);
}

export default changePasswordRoot;
