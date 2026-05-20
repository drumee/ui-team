function progressDots(pfx, step) {
  return Skeletons.Box.X({
    className: `${pfx}__progress`,
    kids: [0, 1, 2].map((i) =>
      Skeletons.Box.X({
        className: `${pfx}__progress-dot${i <= step ? ` ${pfx}__progress-dot--active` : ""}`,
      }),
    ),
  });
}

function modalHeader(ui, { title, subtitle, description, step, withBack }) {
  const pfx = ui.fig.family;
  const titleRow = Skeletons.Box.X({
    className: `${pfx}__title-row`,
    kids: [
      withBack
        ? Skeletons.Button.Svg({
          ico: "arrow-left",
          className: `${pfx}__back`,
          service: "delete-account-back",
          uiHandler: [ui],
        })
        : null,
      Skeletons.Note({ className: `${pfx}__title`, content: title }),
    ].filter(Boolean),
  });

  return Skeletons.Box.Y({
    className: `${pfx}__header`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__header-row`,
        kids: [titleRow, progressDots(pfx, step)],
      }),
      Skeletons.Box.Y({
        className: `${pfx}__header-text`,
        kids: [
          Skeletons.Note({ className: `${pfx}__subtitle`, content: subtitle }),
          Skeletons.Note({
            className: `${pfx}__description`,
            content: description,
          }),
        ],
      }),
    ],
  });
}

function consequenceRow(pfx, opt) {
  const { variant, title, subtitle, icon } = opt;
  return Skeletons.Box.X({
    className: `${pfx}__row ${pfx}__row--${variant}`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__row-icon`,
        kids: [icon],
      }),
      Skeletons.Box.Y({
        className: `${pfx}__row-text`,
        kids: [
          Skeletons.Note({ className: `${pfx}__row-title`, content: title }),
          Skeletons.Note({
            className: `${pfx}__row-subtitle`,
            content: subtitle,
          }),
        ],
      }),
    ],
  });
}

function xIcon(pfx) {
  return Skeletons.Button.Svg({ ico: "cross", className: `${pfx}__icon-x` });
}

function minusIcon(pfx) {
  return Skeletons.Note({ className: `${pfx}__icon-minus`, content: "−" });
}

function footerButton(ui, opt) {
  const pfx = ui.fig.family;
  const { label, service, variant, kids, state, sys_pn } = opt;
  return Skeletons.Box.X({
    className: `${pfx}__btn ${pfx}__btn--${variant}`,
    service,
    state,
    sys_pn,
    uiHandler: [ui],
    kids: kids || [
      Skeletons.Note({ className: `${pfx}__btn-label`, content: label }),
    ],
  });
}

function step1(ui) {
  const pfx = ui.fig.family;
  const header = modalHeader(ui, {
    title: LOCALE.DELETE_ACCOUNT_TITLE || "Delete Account",
    subtitle: LOCALE.DELETE_ACCOUNT_WHAT_DELETED || "What will be deleted",
    description:
      LOCALE.DELETE_ACCOUNT_REVIEW ||
      "Review carefully. Once your account is deleted, this cannot be undone.",
    step: 0,
    withBack: false,
  });

  const rows = Skeletons.Box.Y({
    className: `${pfx}__rows`,
    kids: [
      consequenceRow(pfx, {
        variant: "danger",
        icon: xIcon(pfx),
        title: LOCALE.DELETE_ACCOUNT_LOGIN_TITLE || "Your account & login",
        subtitle: LOCALE.DELETE_ACCOUNT_LOGIN_DESC || "Deleted immediately",
      }),
      consequenceRow(pfx, {
        variant: "danger",
        icon: xIcon(pfx),
        title: LOCALE.DELETE_ACCOUNT_FILES_TITLE || "Personal files & uploads",
        subtitle:
          LOCALE.DELETE_ACCOUNT_FILES_DESC ||
          "Purged after 30-day grace period",
      }),
      consequenceRow(pfx, {
        variant: "danger",
        icon: xIcon(pfx),
        title: LOCALE.DELETE_ACCOUNT_CHAT_TITLE || "Chat history",
        subtitle:
          LOCALE.DELETE_ACCOUNT_CHAT_DESC || "Purged after 30-day grace period",
      }),
      consequenceRow(pfx, {
        variant: "info",
        icon: minusIcon(pfx),
        title:
          LOCALE.DELETE_ACCOUNT_SHARED_TITLE || "Files in shared workspaces",
        subtitle:
          LOCALE.DELETE_ACCOUNT_SHARED_DESC ||
          "Remain — they belong to the workspace, not your account",
      }),
      consequenceRow(pfx, {
        variant: "info",
        icon: minusIcon(pfx),
        title: LOCALE.DELETE_ACCOUNT_AUDIT_TITLE || "Audit logs",
        subtitle:
          LOCALE.DELETE_ACCOUNT_AUDIT_DESC ||
          "Retained by Hub Admin for compliance",
      }),
    ],
  });

  const footer = Skeletons.Box.X({
    className: `${pfx}__footer`,
    kids: [
      footerButton(ui, {
        variant: "cancel",
        label: LOCALE.CANCEL || "Cancel",
        service: "delete-account-cancel",
      }),
      footerButton(ui, {
        variant: "continue",
        service: "delete-account-step1-continue",
        kids: [
          Skeletons.Note({
            className: `${pfx}__btn-label`,
            content: LOCALE.DELETE_ACCOUNT_CONTINUE || "I understand, continue",
          }),
          Skeletons.Note({ className: `${pfx}__btn-arrow`, content: "→" }),
        ],
      }),
    ],
  });

  return [header, rows, footer];
}

function exportItem(ui, { key, title, size }) {
  const pfx = ui.fig.family;
  const checked = ui._selected.has(key);
  return Skeletons.Box.X({
    className: `${pfx}__export-item${checked ? ` ${pfx}__export-item--checked` : ""}`,
    service: "delete-account-toggle-item",
    uiHandler: [ui],
    item_key: key,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__checkbox${checked ? ` ${pfx}__checkbox--checked` : ""}`,
        kids: checked
          ? [
            Skeletons.Image.Svg({
              ico: "editbox_checkmark",
              className: `${pfx}__checkbox-mark`,
            }),
          ]
          : [],
      }),
      Skeletons.Box.Y({
        className: `${pfx}__export-text`,
        kids: [
          Skeletons.Note({ className: `${pfx}__export-title`, content: title }),
          Skeletons.Note({ className: `${pfx}__export-size`, content: size }),
        ],
      }),
    ],
  });
}

function step2(ui) {
  const pfx = ui.fig.family;
  const header = modalHeader(ui, {
    title: LOCALE.DELETE_ACCOUNT_TITLE || "Delete Account",
    subtitle: LOCALE.DELETE_ACCOUNT_EXPORT_TITLE || "Export your data first",
    description:
      LOCALE.DELETE_ACCOUNT_EXPORT_DESC ||
      "We recommend downloading your data before deletion. You can skip this step.",
    step: 1,
    withBack: true,
  });

  const items = [
    {
      key: "files",
      title: LOCALE.DELETE_ACCOUNT_EXPORT_FILES || "File & Uploads",
      size: "240 MB",
    },
    {
      key: "chat",
      title: LOCALE.DELETE_ACCOUNT_EXPORT_CHAT || "Chat history",
      size: "12 MB",
    },
    {
      key: "workspace",
      title: LOCALE.DELETE_ACCOUNT_EXPORT_WORKSPACE || "Workspace data",
      size: "88 MB",
    },
    {
      key: "activity",
      title: LOCALE.DELETE_ACCOUNT_EXPORT_ACTIVITY || "Activity log",
      size: "2 MB",
    },
  ];

  const grid = Skeletons.Box.Y({
    className: `${pfx}__export-grid`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__export-row`,
        kids: [exportItem(ui, items[0]), exportItem(ui, items[1])],
      }),
      Skeletons.Box.X({
        className: `${pfx}__export-row`,
        kids: [exportItem(ui, items[2]), exportItem(ui, items[3])],
      }),
      Skeletons.Box.X({
        className: `${pfx}__export-download-row`,
        kids: [
          Skeletons.Box.X({
            className: `${pfx}__download`,
            service: "delete-account-download",
            state: ui._selected.size === 0 ? 0 : 1,
            uiHandler: [ui],
            kids: [
              Skeletons.Button.Svg({
                ico: "download",
                className: `${pfx}__download-ico`,
              }),
              Skeletons.Note({
                className: `${pfx}__download-label`,
                content: (LOCALE.DELETE_ACCOUNT_DOWNLOAD_SELECTED || "Download selected ({0})").format(ui._selected.size)
              }),
            ],
          }),
        ],
      }),
      Skeletons.Box.X({
        className: `${pfx}__export-row`,
        sys_pn: "message"
      }),
    ],
  });

  const footer = ui._export_only
    ? Skeletons.Box.X({
        className: `${pfx}__footer`,
        kids: [
          footerButton(ui, {
            variant: "cancel",
            label: LOCALE.CLOSE || "Close",
            service: "delete-account-cancel",
          }),
          footerButton(ui, {
            variant: "continue step2",
            sys_pn: "step2-button",
            state: ui._selected.size > 0 ? 0 : 1,
            label: LOCALE.DOWNLOAD || "Download",
            service: "delete-account-download",
          }),
        ],
      })
    : Skeletons.Box.X({
        className: `${pfx}__footer ${pfx}__footer--triple`,
        kids: [
          footerButton(ui, {
            variant: "cancel",
            label: LOCALE.CANCEL || "Cancel",
            service: "delete-account-cancel",
          }),
          footerButton(ui, {
            variant: "continue",
            label: LOCALE.DELETE_ACCOUNT_SKIP_EXPORT || "Skip export",
            service: "delete-account-step2-skip",
          }),
          footerButton(ui, {
            variant: "continue step2",
            sys_pn: "step2-button",
            state: ui._selected.size > 0 ? 0 : 1,
            label: LOCALE.CONTINUE || "Continue",
            service: "delete-account-step2-continue",
          }),
        ],
      });

  return [header, grid, footer];
}

function step3(ui) {
  const pfx = ui.fig.family;
  const passwordSet = (Visitor.profile() || {}).password_set;
  const usePassword =
    passwordSet === undefined || parseInt(passwordSet) === 1;

  const header = modalHeader(ui, {
    title: LOCALE.DELETE_ACCOUNT_TITLE || "Delete Account",
    subtitle: LOCALE.DELETE_ACCOUNT_CONFIRM_TITLE || "Confirm account deletion",
    description: usePassword
      ? (LOCALE.DELETE_ACCOUNT_CONFIRM_DESC_PASSWORD ||
         "This is your last chance. Enter your password to confirm.")
      : (LOCALE.DELETE_ACCOUNT_CONFIRM_DESC_OTP ||
         "This is your last chance. We'll send a code to your email."),
    step: 2,
    withBack: true,
  });

  const warning = Skeletons.Box.X({
    className: `${pfx}__warning`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__warning-icon`,
        kids: [
          Skeletons.Button.Svg({
            ico: "apps-warning",
            className: `${pfx}__warning-svg`,
          }),
        ],
      }),
      Skeletons.Note({
        className: `${pfx}__warning-text`,
        content:
          LOCALE.DELETE_ACCOUNT_WARNING_DEACTIVATE ||
          "Your account will be deactivated immediately.",
      }),
    ],
  });

  // OAuth-only users have no password to enter — replace the field
  // with a short hint; the final-confirm handler routes them through
  // the email-OTP modal instead.
  const verifierField = usePassword
    ? Skeletons.Box.Y({
        className: `${pfx}__password-block`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__password-label`,
            content:
              LOCALE.DELETE_ACCOUNT_PASSWORD_LABEL ||
              "Enter your password to confirm",
          }),
          Skeletons.Box.X({
            className: `${pfx}__password-input`,
            kids: [
              Skeletons.Entry({
                className: `${pfx}__password-entry`,
                placeholder: LOCALE.ENTER_PASSWORD || "Enter password",
                name: "delete_password",
                formItem: "delete_password",
                type: ui._showPassword ? "text" : "password",
                value: ui._password || "",
                mode: _a.commit,
                uiHandler: [ui],
              }),
              Skeletons.Button.Svg({
                ico: ui._showPassword ? "eye_closed" : "eye",
                className: `${pfx}__password-toggle`,
                service: "delete-account-toggle-password",
                uiHandler: [ui],
              }),
            ],
          }),
          Skeletons.Wrapper.X({
            sys_pn: "error-box",
          }),
        ],
      })
    : Skeletons.Box.Y({
        className: `${pfx}__password-block`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__password-label`,
            content:
              LOCALE.DELETE_ACCOUNT_OTP_HINT ||
              "We'll email you a verification code when you confirm.",
          }),
          Skeletons.Wrapper.X({
            sys_pn: "error-box",
          }),
        ],
      });

  const body = Skeletons.Box.Y({
    className: `${pfx}__confirm-body`,
    kids: [warning, verifierField],
  });

  const footer = Skeletons.Box.X({
    className: `${pfx}__footer`,
    kids: [
      footerButton(ui, {
        variant: "cancel",
        label: LOCALE.CANCEL || "Cancel",
        service: "delete-account-cancel",
      }),
      footerButton(ui, {
        variant: "continue",
        sys_pn: "delete-button",
        label: LOCALE.DELETE_ACCOUNT_FINAL || "Delete my account",
        service: "delete-account-final",
      }),
    ],
  });

  return [header, body, footer];
}

function stepHint(pfx, step) {
  const labels = [
    LOCALE.DELETE_ACCOUNT_STEP_HINT_1 || "STEP 1 of 3: consequences",
    LOCALE.DELETE_ACCOUNT_STEP_HINT_2 || "STEP 2 of 3: Export",
    LOCALE.DELETE_ACCOUNT_STEP_HINT_3 || "STEP 3 of 3: confirm",
  ];
  return Skeletons.Box.X({
    className: `${pfx}__step-hint`,
    kids: [
      Skeletons.Box.X({ className: `${pfx}__step-hint-dot` }),
      Skeletons.Note({
        className: `${pfx}__step-hint-label`,
        content: labels[step] || labels[0],
      }),
    ],
  });
}

export default function delete_account_skeleton(ui) {
  const pfx = ui.fig.family;
  const renderers = [step1, step2, step3];
  const step = Math.max(0, Math.min(2, ui._step || 0));
  return [
    Skeletons.Box.Y({
      className: `${pfx}__modal ${pfx}__modal--step-${step + 1}`,
      kids: renderers[step](ui),
    }),
    stepHint(pfx, step),
    // Layered slot for the OTP-gate modal that OAuth-only users go
    // through instead of password verification at the final step.
    Skeletons.Wrapper.Y({
      className: `${pfx}__overlay`,
      sys_pn: "overlay",
    }),
  ];
}
