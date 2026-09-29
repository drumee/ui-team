function leaveConfirm(ui) {
  const pfx = ui.fig.family;
  const busy = ui._busy;

  const header = Skeletons.Box.X({
    className: `${pfx}__header`,
    kids: [
      Skeletons.Note({
        className: `${pfx}__title`,
        content: LOCALE.UNSAVED_CHANGES,
      }),
      Skeletons.Button.Svg({
        ico: "cross",
        className: `${pfx}__close`,
        service: busy ? null : "leave-confirm-stay",
        uiHandler: [ui],
      }),
    ],
  });

  const body = Skeletons.Note({
    className: `${pfx}__message`,
    content: LOCALE.UNSAVED_PROFILE_CHANGES_DESC,
  });

  const btn = (modifier, label, service) =>
    Skeletons.Box.X({
      className: `${pfx}__btn ${pfx}__btn--${modifier}${busy ? " is-loading" : ""}`,
      service: busy ? null : service,
      uiHandler: [ui],
      kids: [
        Skeletons.Note({ className: `${pfx}__btn-label`, content: label }),
      ],
    });

  const footer = Skeletons.Box.X({
    className: `${pfx}__footer`,
    kids: [
      btn("secondary", LOCALE.DISCARD, "leave-confirm-discard"),
      btn("primary", busy ? LOCALE.SAVING : LOCALE.SAVE_CHANGES, "leave-confirm-save"),
    ],
  });

  // The backdrop answers "stay". The card swallows its own clicks (bubble:0,
  // like the otp-gate card) so a click inside never reaches the backdrop.
  return Skeletons.Box.Y({
    className: `${pfx}__backdrop`,
    service: busy ? null : "leave-confirm-stay",
    uiHandler: [ui],
    kids: [
      Skeletons.Box.Y({
        className: `${pfx}__modal`,
        service: "leave-confirm-noop",
        bubble: 0,
        uiHandler: [ui],
        kids: [header, body, footer],
      }),
    ],
  });
}

export default leaveConfirm;
