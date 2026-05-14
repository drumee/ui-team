const __skl_contact_invitationForm = function (ui) {

  const inviteFormFig = ui.fig.family;
  const { mode } = ui.model.toJSON();

  let header = "";
  if (mode === "addressBook") {
    header = Skeletons.Box.X({
      className: `${inviteFormFig}__wrapper header`,
      kids: [
        Skeletons.Note({
          className: `${inviteFormFig}__note header`,
          content: LOCALE.INVITE_SOMEONE,
        }), //'Invite Someone'
      ],
    });
  }

  const emailorIdent = Skeletons.Box.Y({
    className: `${inviteFormFig}__wrapper email`,
    kids: [
      Skeletons.Box.X({
        className: `${inviteFormFig}__label-wrapper`,
        kids: [
          Skeletons.Note({
            className: `${inviteFormFig}__label-item text`,
            content: "Email",
          }),
          Skeletons.Button.Svg({
            ico: "drumee_user_hourglass", //user-help
            className: `${inviteFormFig}__label-item user-help`,
            sys_pn: "drumee_user_hourglass",
            service: "open-sent-contact",
            type: "pending-list",
          }),
        ],
      }),
      // Skeletons.Button.Svg({
      //   ico: 'account_mail',
      //   className: `${inviteFormFig}__icon account_mail`
      // }),

      Skeletons.Entry({
        className: `${inviteFormFig}__entry email`,
        name: _a.email,
        formItem: _a.email,
        innerClass: _a.email,
        placeholder: LOCALE.EMAIL,
        preselect: 1,
        errorHandler: [ui],
        validators: [
          { reason: "require", comply: Validator.require },
          { reason: "invalid_email", comply: Validator.emailOrIdent },
        ],
      }),

      // Skeletons.Button.Svg({
      //   ico: 'drumee_user_hourglass', //user-help
      //   className: `${inviteFormFig}__icon user-help`,
      //   sys_pn: 'drumee_user_hourglass',
      //   service: 'open-sent-contact',
      //   type: 'pending-list'
      // })
    ],
  });

  // const message = Skeletons.Box.X({
  //   className: `${inviteFormFig}__wrapper message`,
  //   kids: [
  //     Skeletons.Entry({
  //       className: `${inviteFormFig}__entry message`,
  //       type: _a.textarea,
  //       name: _a.message,
  //       formItem: _a.message,
  //       innerClass: _a.message,
  //       placeholder: LOCALE.YOUR_MSG || "",
  //     }), //'your message'
  //   ],
  // });

  const errorWrapper = Skeletons.Wrapper.Y({
    className: `${inviteFormFig}__wrapper error-message`,
    name: "errorBox",
  });

  const buttons = Skeletons.Box.X({
    className: `${inviteFormFig}__wrapper buttons`,
    kids: [
      Preset.ConfirmButtons(
        ui,
        {
          confirmLabel: LOCALE.INVITE,
        },
        {
          sys_pn: "submit-button",
          state: 1,
          dataset: {
            wait: 0,
          },
        }
      ),
    ],
  });

  const form = Skeletons.Box.Y({
    className: `${inviteFormFig}__container`,
    kids: [emailorIdent, errorWrapper],
  });

  const a = Skeletons.Box.Y({
    className: `${inviteFormFig}__main`,
    debug: __filename,
    kids: [header, form, buttons],
  });

  return a;
};

module.exports = __skl_contact_invitationForm;
