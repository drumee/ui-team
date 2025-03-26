
function __skl_welcome_reset_main (_ui_) {
  const emailFig = _ui_.fig.family

  const emailValidators = [      
    {reason: LOCALE.ENTER_VALID_EMAIL , comply: Validator.email},
    {reason: LOCALE.EMAIL_REQUIRED , comply: Validator.require}
  ]

  const title = Skeletons.Box.X({
    className  : `${emailFig}__row title email-title no-background`,
    kids       : [
      Skeletons.Note({
        className  : `${emailFig}__note title`,
        content    : LOCALE.ENTER_REGISTERED_EMAIL_RESET_PASSWORD
      })
    ]
  })

  const email = Skeletons.Box.X({
    className  : `${emailFig}__wrapper email`,
    kids       : [
      Skeletons.Box.Y({
        className : `${emailFig}__row email`,
        kids : [    
          Skeletons.Button.Svg({
            ico       : 'account_mail',
            className : `${emailFig}__icon email input-wrapper account_mail`
          }),

          Skeletons.EntryBox({
            className     : `${emailFig}__entry email with-icon`,
            sys_pn        : 'ref-email',
            placeholder   : LOCALE.EMAIL,
            require       : _a.email,
            mode          : _a.commit,
            interactive   : 1,
            preselect     : 1,
            service       : _e.submit,
            uiHandler     : [_ui_],
            errorHandler  : [_ui_],
            validators    : emailValidators,
            showError     : false
          })
        ]
      })
    ]
  })

  const submit = require('../../skeleton/common/button').default(_ui_, _e.submit, 'Go')
  const msgBox = require('../../skeleton/common/message-box').default(_ui_)

  let a = Skeletons.Box.Y({
    debug     : __filename,  
    className : `${emailFig}__items email`,
    kids      : [
      title,
      email,
      submit,
      msgBox
    ]
  })

  return a;
};

export default __skl_welcome_reset_main
