/* ================================================================== *
 * Copyright Xialia.com  2011-2020
 * FILE : /src/drumee/modules/welcome/signup/skeleton/b2csignup.js
 * TYPE : Skeleton
 * ===================================================================**/

// ===========================================================
//
// ===========================================================
function __skl_welcome_signup_b2c  (_ui_) {
  const b2cSignupFig = _ui_.fig.family
  
  _ui_.debug('b2csignup', _ui_)

  const firstName = Skeletons.Box.X({
    className  : `${b2cSignupFig}__wrapper first-name`,
    kids       : [
      Skeletons.Box.X({
        className  : `${b2cSignupFig}__row first-name`,
        kids       : [
          Skeletons.Button.Svg({
            ico       : 'profile-signup',
            className : `${b2cSignupFig}__icon first-name input-wrapper profile-signup`,
          }),

          Skeletons.EntryBox({
            className     : `${b2cSignupFig}__entry first-name with-icon`,
            formItem      : _a.firstname,
            placeholder   : LOCALE.FIRSTNAME,
            uiHandler     : _ui_,
            errorHandler  : [_ui_],
            validators    : [
              { reason: LOCALE.FIRST_NAME_REQUIRED, comply: Validator.require }
            ]
          })
        ]
      })
    ]
  })

  const lastName = Skeletons.Box.X({
    className  : `${b2cSignupFig}__wrapper last-name`,
    kids       : [
      Skeletons.Box.X({
        className  : `${b2cSignupFig}__row last-name`,
        kids       : [
          Skeletons.Button.Svg({
            ico       : 'profile-signup',
            className : `${b2cSignupFig}__icon last-name input-wrapper profile-signup`,
          }),

          Skeletons.EntryBox({
            className     : `${b2cSignupFig}__entry last-name with-icon`,
            formItem      : _a.lastname,
            placeholder   : LOCALE.LASTNAME,
            uiHandler     : _ui_,
            errorHandler  : [_ui_],
            validators    : [
              { reason: LOCALE.LASTNAME_REQUIRED , comply: Validator.require }
            ]
          })
        ]
      })
    ]
  })

  const password = require('../../skeleton/password').default(_ui_, `${b2cSignupFig}__row`, 1)

  const conditions = Skeletons.Box.X({
    className : `${b2cSignupFig}__row conditions without-icon b2c-signup`,
    sys_pn    : 'wrapper-email',
    dataset   : {
      lang : Visitor.language()
    },
    kids      : [
      Skeletons.Button.Svg({
        className : `${b2cSignupFig}__icon checkbox conditions`,
        icons     : ['box-tags','backoffice_checkboxfill'],
        sys_pn    : 'conditions-checkbox',
        state     : 0,
        formItem  : _a.condition,
        reference : _a.state
      }),

      Skeletons.Note({
        className : `${b2cSignupFig}__note conditions static`,
        content   : LOCALE.I_ACCEPT
      }),

      Skeletons.Note({
        className : `${b2cSignupFig}__note conditions trigger text-underline`,
        content   : LOCALE.GENERAL_TERMS_USE,
        service   : 'open-terms-and-conditions',
        uiHandler : [_ui_]
      })
    ]
  })
  
  const nextBtn = require('../../skeleton/common/button').default(_ui_, 'create-b2c-signup-data')
  const msgBox = require('../../skeleton/common/message-box').default(_ui_)

  let a = Skeletons.Box.Y({
    className  : `${b2cSignupFig}__items personal-data b2c-signup`,
    debug      : __filename,
    kids       : [
      firstName,
      lastName,
      password,
      conditions,
      nextBtn,
      msgBox
    ]
  })

  return a;

}

export default __skl_welcome_signup_b2c