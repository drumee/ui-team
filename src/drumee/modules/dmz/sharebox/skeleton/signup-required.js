
function __skl_dmz_sharebox_signup_required(_ui_) {
  const signupFig = `${_ui_.fig.family}-signup-required`

  const header = Skeletons.Box.Y({
    className : `${signupFig}__header`,
    kids      : [
      Skeletons.Button.Svg({
        ico       : 'raw-logo-drumee-full',
        className : `${signupFig}__logo`,
      }),
      Skeletons.Note({
        className : `${signupFig}__title`,
        content   : LOCALE.SECURE_SHARE_SIGNUP_REQUIRED_TITLE,
      }),
      Skeletons.Note({
        className : `${signupFig}__body`,
        content   : LOCALE.SECURE_SHARE_SIGN_UP_REQUIRED,
      }),
    ]
  })

  const actions = Skeletons.Box.Y({
    className : `${signupFig}__actions`,
    kids      : [
      Skeletons.Note({
        className : `${signupFig}__signup-btn`,
        content   : LOCALE.SECURE_SHARE_SIGN_UP_BTN,
        service   : 'open-signup',
        uiHandler : _ui_,
        kidsOpt   : { active: 0 },
      }),
      Skeletons.Note({
        className : `${signupFig}__login-link`,
        content   : LOCALE.SECURE_SHARE_ALREADY_HAVE_ACCOUNT,
        service   : 'go-login',
        uiHandler : _ui_,
        kidsOpt   : { active: 0 },
      }),
    ]
  })

  return Skeletons.Box.Y({
    className : `${signupFig}__panel`,
    debug     : __filename,
    kids      : [header, actions]
  })
}

export default __skl_dmz_sharebox_signup_required;
