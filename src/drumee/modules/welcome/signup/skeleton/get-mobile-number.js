/* ================================================================== *
 * Copyright Xialia.com  2011-2020
 * FILE : /src/drumee/modules/welcome/signup/skeleton/get-mobile-number.js
 * TYPE : Skeleton
 * ===================================================================**/

// ===========================================================
//
// ===========================================================
function __skl_welcome_signup_get_mobile_number (_ui_) {
  const getMobFig = _ui_.fig.family

  const mobileValidator = [
    {reason: LOCALE.MOBILE_NOT_REQUIRED , comply: Validator.require},
    {reason: LOCALE.NAME_REQUIRE , comply: Validator.phone}
  ]

  const title = Skeletons.Box.X({
    className  : `${getMobFig}__row title mobile-title no-background`,
    kids       : [
      Skeletons.Note({
        className  : `${getMobFig}__note title`,
        content    : LOCALE.ENTER_OR_SKIP//'Enter your mobile number or skip'//LOCALE.ENTER_MOBILE_NUMBER
      })
    ]
  })

  const getMobile = Skeletons.Box.X({
    className  : `${getMobFig}__wrapper get-mobile`,
    kids       : [
      Skeletons.Box.X({
        className  : `${getMobFig}__row area-code without-background`,
        kids       : [
          Skeletons.Button.Svg({
            ico       : 'area-code',
            className : `${getMobFig}__icon area-code input-wrapper`,
          }),
          
          Skeletons.EntryBox({
            className     : `${getMobFig}__entry area-code with-icon`,
            formItem      : 'areacode',
            placeholder   : ' ',
            uiHandler     : _ui_,
            errorHandler  : [_ui_],
            validators    : [
              { reason: LOCALE.AREA_CODE_REQUIRED , comply: Validator.require } //Area code required'
            ]
          })
        ]
      }),
      
      Skeletons.Box.X({
        className  : `${getMobFig}__row get-mobile without-background`,
        kids       : [
          Skeletons.Button.Svg({
            ico       : 'adressbook_call',
            className : `${getMobFig}__icon get-mobile personal-mobile input-wrapper adressbook_call`,
          }),

          Skeletons.EntryBox({
            className   : `${getMobFig}__entry mobile get-mobile with-icon`,
            formItem    : _a.mobile,
            placeholder : LOCALE.MOBILE_NUMBER,
            validators  : mobileValidator,
            showError   : false,
          })
        ]
      })
    ]
  })

  const nextBtn = require('../../skeleton/common/button').default(_ui_, 'create-b2c-user')
  const msgBox = require('../../skeleton/common/message-box').default(_ui_)
  
  const notNow = Skeletons.Box.X({
    className : `${getMobFig}__row buttons-wrapper buttons skip-button no-background`,
    sys_pn    : 'skip-button-wrapper',
    service   : 'create-b2c-user',
    type       : 'skip-mobile',
    uiHandler : [_ui_],
    kidsOpt   : {
      active : 0
    },
    kids      : [
      Skeletons.Note({
        className  : `${getMobFig}__button-confirm skip-button`,
        content    : LOCALE.SKIP//'Skip'
      })
    ]
  })

  let a = Skeletons.Box.Y({
    className  : `${getMobFig}__items get-mobile-number`,
    debug      : __filename,
    kids       : [
      title,
      getMobile,
      nextBtn,
      msgBox,
      notNow
    ]
  })

  return a;

}

export default __skl_welcome_signup_get_mobile_number