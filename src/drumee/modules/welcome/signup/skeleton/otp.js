/* ================================================================== *
 * Copyright Xialia.com  2011-2020
 * FILE : /src/drumee/modules/welcome/signup/skeleton/otp.js
 * TYPE : Skeleton
 * ===================================================================**/

// ===========================================================
//
// ===========================================================
function __skl_welcome_signup_otp (_ui_) {
  const otpFig = _ui_.fig.family

  const mobile = Skeletons.Box.X({
    className  : `${otpFig}__wrapper mobile-number`,
    kids       : [
      Skeletons.Box.Y({
        className  : `${otpFig}__row mobile-number no-background`,
        kids       : [
          Skeletons.Note({
            className  : `${otpFig}__note mobile-number`,
            content    : LOCALE.ENTER_SMS_YOUR_MOBILE
          }),

          Skeletons.Box.X({
            className  : `${otpFig}__mobile-wrapper`,
            kids       : [
              Skeletons.Button.Svg({
                ico       : 'adressbook_call',
                className : `${otpFig}__icon mobile-number adressbook_call`,
              }),
    
              Skeletons.Note({
                className  : `${otpFig}__note mobile-number`,
                content    : _ui_.data.metadata.mobile
              })
            ]
          })
        ]
      })
    ]
  })

  const code = Skeletons.Box.X({
    className  : `${otpFig}__wrapper code`,
    kids       : [
      Skeletons.Box.X({
        className  : `${otpFig}__row code`,
        kids       : [
          Skeletons.Button.Svg({
            ico       : 'account_sms',
            className : `${otpFig}__icon code input-wrapper account_sms`,
          }),

          Skeletons.EntryBox({
            className     : `${otpFig}__entry code with-icon`,
            formItem      : _a.code,
            preselect     : 1,
            placeholder   : LOCALE.ENTER_CODE,
            uiHandler     : [_ui_],
            errorHandler  : [_ui_],
            validators    : [
              { reason: LOCALE.CODE_REQUIRED , comply: Validator.require }
            ],
            showError     : false
          })
        ]
      })
    ]
  })
  
  const nextBtn = require('../../skeleton/common/button').default(_ui_, 'verify-code', 'Go')
  const msgBox = require('../../skeleton/common/message-box').default(_ui_)

  const noCode = Skeletons.Box.Y({
    className  : `${otpFig}__wrapper no-code`,
    sys_pn     : 'no-code-options',
    dataset    : {
      mode  : _a.closed
    },
    kids       : [
      Skeletons.Box.X({
        className  : `${otpFig}__row no-code no-background`,
        kids       : [
          Skeletons.Note({
            className  : `${otpFig}__note no-code no-code-text`,
            content    : LOCALE.NO_CODE_RECEIVED
          })
        ]
      }),

      Skeletons.Box.X({
        className  : `${otpFig}__row no-code-options no-background`,
        kids       : [
          Skeletons.Note({
            className  : `${otpFig}__note resent-code no-code text-underline`,
            content    : LOCALE.RESEND_NEW_CODE,
            service    : 'resend-otp',
            uiHandler  : [_ui_]
          }),

          Skeletons.Note({
            className  : `${otpFig}__note correct-number no-code text-underline`,
            content    : LOCALE.WRONG_NUMBER,
            service    : 'change-mobile-number',
            uiHandler  : [_ui_]
          }),

          Skeletons.Note({
            className  : `${otpFig}__note skip-otp no-code text-underline`,
            content    : LOCALE.SKIP,//'Skip',
            service    : 'skip-mobile-otp',
            uiHandler  : [_ui_]
          })
        ]
      })
    ]
  })

  let a = Skeletons.Box.Y({
    className  : `${otpFig}__items otp`,
    debug      : __filename,
    kids       : [
      mobile,
      code,
      nextBtn,
      msgBox,
      noCode
    ]
  })

  return a;

}

export default __skl_welcome_signup_otp