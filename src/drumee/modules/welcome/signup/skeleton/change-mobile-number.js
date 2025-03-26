/* ================================================================== *
 * Copyright Xialia.com  2011-2020
 * FILE : /src/drumee/modules/welcome/signup/skeleton/change-mobile-number.js
 * TYPE : Skeleton
 * ===================================================================**/

// ===========================================================
//
// ===========================================================
function __skl_welcome_signup_change_mobile_number (_ui_) {
  const changeMobFig = _ui_.fig.family

  const mobileValidator = [
    {reason: LOCALE.MOBILE_NOT_REQUIRED , comply: Validator.require},
    {reason: LOCALE.NAME_REQUIRE , comply: Validator.phone}
  ]

  const title = Skeletons.Box.X({
    className  : `${changeMobFig}__row title mobile-title no-background`,
    kids       : [
      Skeletons.Note({
        className  : `${changeMobFig}__note title`,
        content    : LOCALE.CHANGE_MOBILE_NUMBER_AND_RESEND_CODE
      })
    ]
  })

  const mobile = Skeletons.Box.X({
    className  : `${changeMobFig}__wrapper change-mobile`,
    kids       : [
      Skeletons.Box.X({
        className  : `${changeMobFig}__row area-code without-background`,
        kids       : [
          Skeletons.Button.Svg({
            ico       : 'area-code',
            className : `${changeMobFig}__icon area-code input-wrapper`,
          }),
          
          Skeletons.EntryBox({
            className     : `${changeMobFig}__entry area-code with-icon`,
            formItem      : 'areacode',
//            placeholder   : '+',
            uiHandler     : _ui_,
            errorHandler  : [_ui_],
            validators    : [
              { reason: 'Area code required', comply: Validator.require }
            ]
          })
        ]
      }),

      Skeletons.Box.X({
        className  : `${changeMobFig}__row change-mobile without-background`,
        kids       : [
          Skeletons.Button.Svg({
            ico       : 'adressbook_call',
            className : `${changeMobFig}__icon personal-mobile input-wrapper adressbook_call`,
          }),

          Skeletons.EntryBox({
            className   : `${changeMobFig}__entry mobile with-icon`,
            formItem    : _a.mobile,
            placeholder : LOCALE.MOBILE_PHONE,
            value       : _ui_.data.metadata.mobile,
            validators  : mobileValidator,
            showError   : false
          })
        ]
      })
    ]
  })

  const nextBtn = require('../../skeleton/common/button').default(_ui_, 'update-mobile-number', LOCALE.CHANGE_AND_RESEND_CODE);
  const msgBox = require('../../skeleton/common/message-box').default(_ui_);

  let a = Skeletons.Box.Y({
    className  : `${changeMobFig}__items change-mobile-number`,
    debug      : __filename,
    kids       : [
      title,
      mobile,
      nextBtn,
      msgBox
    ]
  })

  return a;

}

export default __skl_welcome_signup_change_mobile_number