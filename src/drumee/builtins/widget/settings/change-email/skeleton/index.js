function readonlyEmailField(ui, opt) {
  const pfx = `${ui.fig.family}__field`;
  const { label, value = "" } = opt;
  return Skeletons.Box.Y({
    className: `${pfx} ${pfx}--readonly`,
    kids: [
      Skeletons.Note({
        className: `${pfx}-label`,
        content: label,
      }),
      Skeletons.Box.X({
        className: `${pfx}-input ${pfx}-input--readonly`,
        kids: [
          Skeletons.Image.Svg({
            ico: "mail",
            className: `${pfx}-ico`,
          }),
          Skeletons.Note({
            className: `${pfx}-readonly-value`,
            content: value,
          }),
        ],
      }),
    ],
  });
}

function emailField(ui, opt) {
  const pfx = `${ui.fig.family}__field`;
  const { label, name, value = "" } = opt;
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
          Skeletons.Image.Svg({
            ico: "mail",
            className: `${pfx}-ico`,
          }),
          Skeletons.Entry({
            className: `${pfx}-entry`,
            placeholder: "name@example.com",
            name,
            type: "email",
            value,
            uiHandler: [ui],
          }),
        ],
      }),
    ],
  });
}

function passwordField(ui, opt) {
  const pfx = `${ui.fig.family}__field`;
  const { label, name, value = "" } = opt;
  const visible = ui._show.password;
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
            service: "change-email-toggle-password",
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
  const currentEmail = (Visitor.profile() || {}).email || "";

  const header = Skeletons.Box.Y({
    className: `${pfx}__header`,
    kids: [
      Skeletons.Note({
        className: `${pfx}__title`,
        content: LOCALE.CHANGE_EMAIL_ADDRESS,
      }),
      Skeletons.Note({
        className: `${pfx}__subtitle`,
        content: LOCALE.CHANGE_EMAIL_HINT,
      }),
    ],
  });

  const fields = Skeletons.Box.Y({
    className: `${pfx}__fields`,
    kids: [
      readonlyEmailField(ui, {
        label: LOCALE.CURRENT_EMAIL_LABEL,
        value: currentEmail,
      }),
      emailField(ui, {
        label: LOCALE.NEW_EMAIL_LABEL,
        name: "new_email",
        value: ui._values.email,
      }),
      passwordField(ui, {
        label: LOCALE.CONFIRM_PASSWORD_LABEL,
        name: "confirm_password",
        value: ui._values.password,
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
        service: "change-email-cancel",
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
        service: submitting ? null : "change-email-submit",
        uiHandler: [ui],
        kids: [
          Skeletons.Note({
            className: `${pfx}__btn-label`,
            content: submitting ? LOCALE.SENDING : LOCALE.SEND_VERIFICATION,
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
    content: LOCALE.EMAIL_VERIFICATION_SENT,
  });

  const description = Skeletons.Note({
    className: `${pfx}__success-description`,
    content: ui._sentTo
      ? LOCALE.EMAIL_VERIFICATION_SENT_DESC.format(ui._sentTo)
      : LOCALE.EMAIL_VERIFICATION_SENT_DESC_GENERIC,
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
        service: "change-email-done",
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

function changeEmailRoot(ui) {
  return ui._step === "success" ? successView(ui) : formView(ui);
}

export default changeEmailRoot;
