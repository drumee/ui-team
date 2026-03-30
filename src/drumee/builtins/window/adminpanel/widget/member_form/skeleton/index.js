const { toggleState } = require("@drumee/ui-essentials")
const { button } = require("builtins/skeleton/toolkit");

function __skl_widget_member_form(ui) {
  const formFig = ui.fig.family
  const data = ui._memberData

  const emailValidators = [
    { reason: LOCALE.ENTER_VALID_EMAIL, comply: Validator.email },
    { reason: LOCALE.EMAIL_REQUIRED, comply: Validator.require }
  ]

  const name = Skeletons.Box.X({
    className: `${formFig}__wrapper name`,
    kids: [
      Skeletons.Button.Svg({
        ico: 'profile-signup',
        className: `${formFig}__icon name profile-signup`
      }),

      Skeletons.Box.Y({
        className: `${formFig}__entry-wrapper name`,
        kids: [
          Skeletons.EntryBox({
            className: `${formFig}__entry firstname`,
            formItem: _a.firstname,
            placeholder: LOCALE.FIRSTNAME,
            value: data.firstname,
            preselect: 1,
            uiHandler: ui,
            errorHandler: [ui],
            showError: 1,
            validators: [
              { reason: LOCALE.FIRST_NAME_REQUIRED, comply: Validator.require } //'First name is required'
            ]
          }),

          Skeletons.EntryBox({
            className: `${formFig}__entry familyname`,
            formItem: _a.lastname,
            placeholder: LOCALE.LASTNAME,
            value: data.lastname,
            uiHandler: ui,
            errorHandler: [ui],
            showError: 1,
            validators: [
              { reason: LOCALE.LASTNAME_REQUIRED, comply: Validator.require } //'Last name is required'
            ]
          })
        ]
      })
    ]
  })

  const email = Skeletons.Box.X({
    className: `${formFig}__wrapper email`,
    kids: [
      Skeletons.Button.Svg({
        ico: 'email',
        className: `${formFig}__icon email`
      }),

      Skeletons.EntryBox({
        className: `${formFig}__entry email`,
        formItem: _a.email,
        innerClass: _a.email,
        interactive: 1,
        sys_pn: 'email-input',
        placeholder: LOCALE.EMAIL,
        value: data.email,
        uiHandler: ui,
        errorHandler: [ui],
        validators: emailValidators,
        showError: 1
      }),
    ]
  })


  const mobile = Skeletons.Box.X({
    className: `${formFig}__wrapper mobile`,
    kids: [
      Skeletons.Button.Svg({
        ico: 'account_phone',
        className: `${formFig}__icon mobile account_phone`
      }),

      Skeletons.Box.X({
        className: `${formFig}__area-code`,
        kids: [
          Skeletons.Note({
            className: `${formFig}__note area-code`,
            content: '+'
          }),

          Skeletons.EntryBox({
            className: `${formFig}__entry area-code`,
            formItem: 'areacode',
            innerClass: 'area-code',
            type: _a.number,
            sys_pn: 'area-code-input',
            interactive: 1,
            placeholder: LOCALE.AREA,
            value: data.areacode.replace('+', ''),
            uiHandler: ui,
            errorHandler: [ui],
            showError: 1,
          }),
        ]
      }),

      Skeletons.EntryBox({
        className: `${formFig}__entry mobile`,
        formItem: _a.mobile,
        innerClass: _a.mobile,
        sys_pn: 'mobile-input',
        interactive: 1,
        placeholder: LOCALE.PHONE,
        value: data.mobile,
        uiHandler: ui,
        errorHandler: [ui],
        showError: 1,
        validators: [
          { reason: LOCALE.VALID_PHONE_NO, comply: Validator.phone }
        ],
      })
    ]
  })



  const messageBox = Skeletons.Box.X({
    className: `${formFig}__message-box`,
    sys_pn: 'message-box',
    dataset: {
      mode: _a.closed
    }
  })

  let buttonLabel = LOCALE.CREATE
  if (ui._type == 'member_edit')
    buttonLabel = LOCALE.MODIFY


  const fig = ui.fig.family;
  const buttons = Skeletons.Box.X({
    className: `${fig}__buttons`,
    uiHandler: ui,
    sys_pn: _a.footer,
    dataset: { page: ui._page },
    kids: [
      button(ui, {
        label: LOCALE.CANCEL,
        type: _a.toggle,
        className: `${fig}__button`,
        service: _e.cancel,
        state: 1,
        priority: "secondary",
      }),
      button(ui, {
        label: buttonLabel,
        type: _a.toggle,
        sys_pn: 'button-validate',
        state: 0,
        sys_pn: 'submit-button',
        ico: "arrow-right",
        service: _e.submit,
        haptic: 5000,
        className: `${fig}__button`,
        priority: "primary",
      })
    ],
  });
  return Skeletons.Box.Y({
    className: `${formFig}__main`,
    debug: __filename,
    kids: [
      Skeletons.Box.Y({
        className: `${formFig}__container`,
        kids: [
          name,
          email,
          mobile,
          messageBox,
          buttons
        ]
      })
    ]
  })

}

export default __skl_widget_member_form