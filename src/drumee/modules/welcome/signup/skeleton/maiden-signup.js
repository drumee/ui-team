function maiden_signup(ui) {
  const b2cSignupFig = ui.fig.family

  const firstName = Skeletons.Box.X({
    className: `${b2cSignupFig}__wrapper first-name`,
    kids: [
      Skeletons.Box.X({
        className: `${b2cSignupFig}__row first-name`,
        kids: [
          Skeletons.Button.Svg({
            ico: 'profile-signup',
            className: `${b2cSignupFig}__icon first-name input-wrapper profile-signup`,
          }),

          Skeletons.EntryBox({
            className: `${b2cSignupFig}__entry first-name with-icon`,
            formItem: _a.firstname,
            name:_a.firstname,
            placeholder: LOCALE.FIRSTNAME,
            uiHandler: ui,
            errorHandler: [ui],
            validators: [
              { reason: LOCALE.FIRST_NAME_REQUIRED, comply: Validator.require }
            ]
          })
        ]
      })
    ]
  })

  const email = Skeletons.Box.X({
    className: `${b2cSignupFig}__wrapper email`,
    kids: [
      Skeletons.Box.X({
        className: `${b2cSignupFig}__row email`,
        kids: [
          Skeletons.Button.Svg({
            ico: 'profile-signup',
            className: `${b2cSignupFig}__icon email input-wrapper profile-signup`,
          }),
          Skeletons.EntryBox({
            className: `${b2cSignupFig}__entry email with-icon`,
            formItem: _a.email,
            name:_a.email,
            placeholder: LOCALE.EMAIL,
            uiHandler: ui,
            errorHandler: [ui],
            validators: [
              { reason: LOCALE.LASTNAME_REQUIRED, comply: Validator.require }
            ]
          })
        ]
      })
    ]
  })

  const password = require('../../skeleton/password').default(ui, `${b2cSignupFig}__row`, 1)

  const conditions = Skeletons.Box.X({
    className: `${b2cSignupFig}__row conditions without-icon b2c-signup`,
    sys_pn: 'wrapper-email',
    dataset: {
      lang: Visitor.language()
    },
    kids: [
      Skeletons.Button.Svg({
        className: `${b2cSignupFig}__icon checkbox conditions`,
        icons: ['box-tags', 'backoffice_checkboxfill'],
        sys_pn: 'conditions-checkbox',
        state: 0,
        formItem: _a.condition,
        reference: _a.state,
        service: 'accept-conditions'
      }),

      Skeletons.Note({
        className: `${b2cSignupFig}__note conditions static`,
        content: LOCALE.I_ACCEPT
      }),

      Skeletons.Note({
        className: `${b2cSignupFig}__note conditions trigger text-underline`,
        content: LOCALE.GENERAL_TERMS_USE,
        service: 'open-terms-and-conditions',
        uiHandler: [ui]
      })
    ]
  })

  const nextBtn = require('../../skeleton/common/button').default(ui, 'direct-signup', LOCALE.SUBMIT)
  const msgBox = require('../../skeleton/common/message-box').default(ui)

  let a = Skeletons.Box.Y({
    className: `${b2cSignupFig}__items personal-data b2c-signup`,
    debug: __filename,
    kids: [
      firstName,
      email,
      password,
      conditions,
      nextBtn,
      msgBox
    ]
  })

  return a;

}

export default maiden_signup