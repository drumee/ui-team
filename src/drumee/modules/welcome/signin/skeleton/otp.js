/* ================================================================== *
 * Copyright Xialia.com  2011-2020
 * FILE : /src/drumee/modules/welcome/signin/skeleton/otp.js
 * TYPE : Skeleton
 * ===================================================================**/

// ===========================================================
//
// ===========================================================

function __skl_welcome_signin_otp (_ui_) {
  const otpFig = _ui_.fig.family

  const mobileNumber = _ui_.data.mobile || ''

  const title = Skeletons.Box.X({
    className  : `${otpFig}__wrapper mobile-number`,
    kids       : [
      Skeletons.Box.Y({
        className  : `${otpFig}__row mobile-number no-background`,
        kids       : [
          Skeletons.Note({
            className  : `${otpFig}__note mobile-number`,
            content    : (mobileNumber.printf(LOCALE.ENTER_OTP_RECEIVED))//Enter sms code received on ******
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
        sys_pn     : 'wrapper-ident',
        kids       : [
          Skeletons.Button.Svg({
            ico       : 'account_sms',
            className : `${otpFig}__icon code input-wrapper account_sms`,
          }),

          Skeletons.EntryBox({
            className     : `${otpFig}__entry code with-icon`,
            sys_pn        : 'ref-code',
            formItem      : _a.code,
            preselect     : 1,
            placeholder   : LOCALE.ENTER_CODE,
            uiHandler     : [_ui_],
            errorHandler  : [_ui_],
            validators    : [
              { reason: LOCALE.CODE_REQUIRED  , comply: Validator.require }
            ],
            showError     : false
          })
        ]
      })
    ]
  })

  const submit = require('../../skeleton/common/button').default(_ui_, 'authenticate', 'Go')
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
            className  : `${otpFig}__note no-code helper`,
            content    : LOCALE.NO_CODE_RECEIVED
          })
        ]
      }),

      Skeletons.Box.X({
        className  : `${otpFig}__row no-code-options resend-code no-background`,
        kids       : [
          Skeletons.Note({
            className  : `${otpFig}__note resent-code helper text-underline`,
            content    : LOCALE.RESEND_NEW_CODE,
            service    : 'resend-otp',
            uiHandler  : [_ui_]
          }),
        ]
      })
    ]
  })

  let a = Skeletons.Box.Y({
    debug     : __filename,  
    className : `${otpFig}__items otp`,
    kids      : [
      title,
      code,
      submit,
      msgBox,
      noCode
    ]
  });

  return a;
};
module.exports = __skl_welcome_signin_otp;
