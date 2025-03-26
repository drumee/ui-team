/* ================================================================== *
 * Copyright Xialia.com  2011-2020
 * FILE : /src/drumee/modules/welcome/signin/skeleton/otp.js
 * TYPE : Skeleton
 * ===================================================================**/

// ===========================================================
//
// ===========================================================

function __skl_account_data_delete_otp (_ui_) {
  const pfx = `${_ui_.fig.family}-deletion-otp`

  const tips = _ui_._data.tips || ''

  const title = Skeletons.Box.X({
    className  : `${pfx}__tips`,
    kids       : [
      Skeletons.Box.Y({
        className  : `${pfx}__row tips no-background`,
        kids       : [
          Skeletons.Note({
            partHandler   : [_ui_],
            sys_pn     : 'code-tips',
            className  : `${pfx}__note tips`,
            content    : (tips.printf(LOCALE.ENTER_OTP_RECEIVED))//Enter sms code received on ******
          })
        ]
      })
    ]
  })

  const code = Skeletons.EntryBox({
    className     : `${pfx}__code`,
    sys_pn        : 'ref-code',
    formItem      : _a.code,
    preselect     : 1,
    placeholder   : LOCALE.ENTER_CODE, //'Enter Code',
    uiHandler     : [_ui_],
    partHandler   : [_ui_],
    errorHandler  : [_ui_],
    validators    : [
      { reason: LOCALE.CODE_REQUIRED  , comply: Validator.require } //'Code is required'
    ],
    showError     : false
  })


  const noCode = Skeletons.Box.X({
    className  : `${pfx}__no-code`,
    sys_pn     : 'no-code',
    partHandler   : [_ui_],
    dataset    : {
      mode  : _a.closed
    },
    kids       : [
      Skeletons.Note({
        className  : `${pfx}__note`,
        content    : LOCALE.NO_CODE_RECEIVED //'No code received?'
      }),

      Skeletons.Note({
        className  : `${pfx}__btn`,
        content    : LOCALE.RESEND_NEW_CODE, //'Resend a new code?',
        service    : 'resend-otp',
        uiHandler  : [_ui_]
      }),
      Skeletons.Button.Svg({
        className  : `${pfx}__note sent`,
        ico        : 'checked',
        dataset    : {
          mode  : _a.closed
        },
      }),
    ]
  })

  let a = Skeletons.Box.Y({
    debug     : __filename,  
    className : `${pfx}__main`,
    kids      : [
      title, 
      code,
      noCode
    ]
  });

  return a;
};
module.exports = __skl_account_data_delete_otp;
