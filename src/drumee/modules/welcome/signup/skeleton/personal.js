/* ================================================================== *
 * Copyright Xialia.com  2011-2020
 * FILE : /src/drumee/modules/welcome/signup/skeleton/personal.js
 * TYPE : Skeleton
 * ===================================================================**/

// ===========================================================
//
// ===========================================================
function __skl_welcome_signup_personal  (_ui_) {
  const personalFig = _ui_.fig.family

  const firstName = Skeletons.Box.X({
    className  : `${personalFig}__wrapper first-name`,
    kids       : [
      Skeletons.Box.X({
        className  : `${personalFig}__row first-name`,
        kids       : [
          Skeletons.Button.Svg({
            ico       : 'profile-signup',
            className : `${personalFig}__icon first-name input-wrapper profile-signup`,
          }),

          Skeletons.EntryBox({
            className     : `${personalFig}__entry first-name with-icon`,
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
    className  : `${personalFig}__wrapper last-name`,
    kids       : [
      Skeletons.Box.X({
        className  : `${personalFig}__row last-name`,
        kids       : [
          Skeletons.Button.Svg({
            ico       : 'profile-signup',
            className : `${personalFig}__icon last-name input-wrapper profile-signup`,
          }),

          Skeletons.EntryBox({
            className     : `${personalFig}__entry last-name with-icon`,
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

  const mobile = Skeletons.Box.X({
    className  : `${personalFig}__wrapper mobile`,
    kids       : [
      Skeletons.Box.X({
        className  : `${personalFig}__row area-code without-background`,
        kids       : [
          Skeletons.Button.Svg({
            ico       : 'area-code',
            className : `${personalFig}__icon area-code input-wrapper`,
          }),
          
          Skeletons.EntryBox({
            className     : `${personalFig}__entry area-code with-icon`,
            formItem      : 'areacode',
            placeholder   : ' ',
            uiHandler     : _ui_,
            errorHandler  : [_ui_],
            validators    : [
              { reason: LOCALE.AREA_CODE_REQUIRED, comply: Validator.require }
            ]
          })
        ]
      }),

      Skeletons.Box.X({
        className  : `${personalFig}__row mobile without-background`,
        kids       : [
          Skeletons.Button.Svg({
            ico       : 'adressbook_call',
            className : `${personalFig}__icon personal-mobile input-wrapper adressbook_call`,
          }),
          
          Skeletons.EntryBox({
            className     : `${personalFig}__entry mobile with-icon`,
            formItem      : _a.mobile,
            placeholder   : LOCALE.MOBILE_PHONE,
            uiHandler     : _ui_,
            errorHandler  : [_ui_],
            validators    : [
              { reason: LOCALE.MOBILE_NUMBER_REQUIRED, comply: Validator.require }
            ]
          })
        ]
      })
    ]
  })

  const city = Skeletons.Box.X({
    className  : `${personalFig}__wrapper city`,
    kids       : [
      Skeletons.Box.X({
        className  : `${personalFig}__row city`,
        kids       : [
          Skeletons.Button.Svg({
            ico       : 'geolocation',
            className : `${personalFig}__icon city input-wrapper geolocation`,
          }),
          
          Skeletons.EntryBox({
            className     : `${personalFig}__entry city with-icon`,
            formItem      : _a.city,
            placeholder   : LOCALE.CITY,
            uiHandler     : _ui_,
            errorHandler  : [_ui_],
            validators    : [
              { reason: LOCALE.CITY_REQUIRED, comply: Validator.require }
            ]
          })
        ]
      })
    ]
  })

  const conditions = Skeletons.Box.X({
    className : `${personalFig}__row conditions without-icon b2b-signup`,
    sys_pn    : 'wrapper-email',
    dataset   : {
      lang : Visitor.language()
    },
    kids      : [
      Skeletons.Button.Svg({
        className : `${personalFig}__icon checkbox conditions`,
        icons     : ['box-tags','backoffice_checkboxfill'],
        sys_pn    : 'conditions-checkbox',
        state     : 0,
        formItem  : _a.condition,
        reference : _a.state
      }),

      Skeletons.Note({
        className : `${personalFig}__note conditions static`,
        content   : LOCALE.I_ACCEPT
      }),

      Skeletons.Note({
        className : `${personalFig}__note conditions trigger text-underline`,
        content   : LOCALE.GENERAL_TERMS_USE,
        service   : 'open-terms-and-conditions',
        uiHandler : [_ui_]
      })
    ]
  })
  
  const nextBtn = require('../../skeleton/common/button').default(_ui_, 'create-personal-data')
  const msgBox = require('../../skeleton/common/message-box').default(_ui_)

  let a = Skeletons.Box.Y({
    className  : `${personalFig}__items personal-data b2b-signup`,
    debug      : __filename,
    kids       : [
      firstName,
      lastName,
      mobile,
      city,
      conditions,
      nextBtn,
      msgBox
    ]
  })

  return a;

}

export default __skl_welcome_signup_personal