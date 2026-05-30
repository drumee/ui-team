
function __skl_dmz_sharebox_email(_ui_) {

  const emailFig = `${_ui_.fig.family}-password`

  const title = Skeletons.Box.X({
    className : `${emailFig}__title`,
    kids      : [
      Skeletons.Note({
        className : `${emailFig}__note title`,
        content   : LOCALE.SECURE_SHARE_ENTER_EMAIL
      })
    ]
  })

  const emailEntry = Skeletons.Box.X({
    className : `${emailFig}__row password`,
    sys_pn    : 'wrapper-email',
    kids      : [
      Skeletons.Button.Svg({
        ico       : 'email',
        className : `${emailFig}__icon lock input-wrapper`,
      }),

      Skeletons.EntryBox({
        className   : `${emailFig}__entry password with-icon`,
        placeholder : LOCALE.SECURE_SHARE_EMAIL_PLACEHOLDER,
        sys_pn      : 'ref-email',
        formItem    : _a.email,
        type        : _a.email,
        preselect   : 1,
        errorHandler  : [_ui_],
        validators    : [
          { reason: LOCALE.SECURE_SHARE_ENTER_EMAIL, comply: Validator.require },
          { reason: LOCALE.INVALID_EMAIL, comply: Validator.email }
        ],
        showError : false
      })
    ]
  })

  const button = Skeletons.Box.X({
    className : `${emailFig}__row buttons-wrapper buttons`,
    sys_pn    : 'button-wrapper',
    service   : 'verify-email',
    uiHandler : _ui_,
    state     : 0,
    dataset   : {
      error : 0,
      mode  : _a.open
    },
    kidsOpt   : {
      active : 0
    },
    kids      : [
      Skeletons.Note({
        className : `${emailFig}__button-confirm`,
        content   : LOCALE.GO
      })
    ]
  })

  const messageBox = Skeletons.Box.X({
    className : `${emailFig}__row message-wrapper message no-background`,
    sys_pn    : 'message-box',
    dataset   : {
      mode  : _a.closed
    }
  })

  const a = Skeletons.Box.Y({
    className : `${emailFig}__container`,
    debug     : __filename,
    kids      : [
      title,

      Skeletons.Box.Y({
        className : `${emailFig}__content`,
        kids      : [
          emailEntry,
          button,
          messageBox
        ]
      })
    ]
  });

  return a;
}

export default __skl_dmz_sharebox_email;
