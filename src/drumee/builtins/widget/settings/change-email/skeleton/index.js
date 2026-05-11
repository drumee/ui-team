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
            placeholder: LOCALE.ENTER_YOUR_CURRENT_PASSWORD,
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

  // OAuth-only users (password_set=0) verify via email OTP after
  // submitting; the password field is skipped entirely.
  const passwordSet = (Visitor.profile() || {}).password_set;
  const usePassword = passwordSet === undefined || parseInt(passwordSet) === 1;

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
      usePassword
        ? passwordField(ui, {
            label: LOCALE.CONFIRM_PASSWORD_LABEL,
            name: "confirm_password",
            value: ui._values.password,
          })
        : null,
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

function resendPanel(ui) {
  const pfx = ui.fig.family;
  const resending = ui._resending;

  const link = Skeletons.Box.X({
    className: `${pfx}__success-resend-link${
      resending ? " is-loading" : ""
    }`,
    service: resending ? null : "change-email-resend",
    uiHandler: [ui],
    kids: [
      Skeletons.Note({
        className: `${pfx}__success-resend-link-text`,
        content: resending ? LOCALE.SENDING : LOCALE.RESEND_EMAIL,
      }),
    ],
  });

  return Skeletons.Box.Y({
    className: `${pfx}__success-resend`,
    kids: [
      Skeletons.Note({
        className: `${pfx}__success-resend-title`,
        content: LOCALE.DIDNT_RECEIVE_EMAIL,
      }),
      Skeletons.Box.X({
        className: `${pfx}__success-resend-body`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__success-resend-prefix`,
            content: LOCALE.CHECK_SPAM_FOLDER_OR,
          }),
          link,
          Skeletons.Note({
            className: `${pfx}__success-resend-suffix`,
            content: ".",
          }),
        ],
      }),
    ],
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

  const resendBlock = Skeletons.Box.Y({
    className: `${pfx}__success-resend-wrap`,
    kids: [resendPanel(ui)],
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
    kids: [header, resendBlock, footer],
  });
}

function changeEmailRoot(ui) {
  const main = ui._step === "success" ? successView(ui) : formView(ui);
  return [
    main,
    // Layered slot for the OTP-gate modal (OAuth-only users).
    Skeletons.Wrapper.Y({
      className: `${ui.fig.family}__overlay`,
      sys_pn: "overlay",
    }),
  ];
}

export default changeEmailRoot;
