function passwordField(ui, opt) {
  const pfx = `${ui.fig.family}__field`;
  const { label, name, fieldKey, placeholder, value = "" } = opt;
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
            placeholder,
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

  // Current-password field only for password-backed accounts; accounts
  // that never set one verify through the email-OTP popup instead (see
  // the widget's class docblock).
  const usePassword = ui.usePassword();

  const fields = Skeletons.Box.Y({
    className: `${pfx}__fields`,
    kids: [
      usePassword
        ? passwordField(ui, {
            label: LOCALE.CURRENT_PASSWORD_LABEL,
            name: "current_password",
            fieldKey: "current",
            placeholder: LOCALE.ENTER_YOUR_CURRENT_PASSWORD,
            value: ui._values.current,
          })
        : null,
      passwordField(ui, {
        label: LOCALE.NEW_PASSWORD_LABEL,
        name: "new_password",
        fieldKey: "next",
        placeholder: LOCALE.ENTER_YOUR_NEW_PASSWORD,
        value: ui._values.next,
      }),
      passwordField(ui, {
        label: LOCALE.CONFIRM_PASSWORD_LABEL,
        name: "confirm_password",
        fieldKey: "confirm",
        placeholder: LOCALE.CONFIRM_YOUR_NEW_PASSWORD,
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

  // "Log out of other devices". Every piece carries the toggle service:
  // Skeletons children are widgets of their own, so a click on the square
  // or the label does NOT bubble up to the row — each element must
  // dispatch the service itself. The tick mark is drawn by the skin
  // (data-checked) — no sprite dependency.
  const logoutToggle = { service: "change-password-toggle-logout", uiHandler: [ui] };
  const logoutRow = Skeletons.Box.X({
    className: `${pfx}__logout-row`,
    ...logoutToggle,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__logout-check`,
        dataset: { checked: ui._logoutOthers ? 1 : 0 },
        ...logoutToggle,
      }),
      Skeletons.Note({
        className: `${pfx}__logout-label`,
        content: LOCALE.LOG_OUT_OTHER_DEVICES,
        ...logoutToggle,
      }),
    ],
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
            content: submitting ? LOCALE.UPDATING : LOCALE.CHANGE_PASSWORD,
          }),
        ],
      }),
    ],
  });

  return Skeletons.Box.Y({
    className: `${pfx}__modal ${pfx}__modal--form`,
    kids: [header, fields, logoutRow, footer],
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
  return [
    ui._step === "success" ? successView(ui) : formView(ui),
    // Layered slot for the OTP-gate modal (OAuth-only users).
    Skeletons.Wrapper.Y({
      className: `${ui.fig.family}__overlay`,
      sys_pn: "overlay",
    }),
  ];
}

export default changePasswordRoot;
