/* ================================================================== *
 * Copyright Xialia.com  2011-2020
 * FILE : /src/drumee/modules/welcome/signup/skeleton/company.js
 * TYPE : Skeleton
 * ===================================================================**/

// ===========================================================
//
// ===========================================================
function __skl_welcome_signup_company (_ui_) {
  const companyFig = _ui_.fig.family

  // const companyName = Skeletons.Box.X({
  //   className  : `${companyFig}__wrapper company`,
  //   kids       : [
  //     Skeletons.Box.X({
  //       className  : `${companyFig}__row company`,
  //       kids       : [
  //         Skeletons.Button.Svg({
  //           ico       : 'company',
  //           className : `${companyFig}__icon company input-wrapper`,
  //         }),

  //         Skeletons.EntryBox({
  //           className   : `${companyFig}__entry with-icon`,
  //           formItem    : 'company_name',
  //           placeholder : LOCALE.COMPANY_NAME,
  //           uiHandler     : _ui_,
  //           errorHandler  : [_ui_],
  //           validators    : [
  //             { reason: LOCALE.COMPANY_NAME_REQUIRED , comply: Validator.require }
  //           ]
  //         })
  //       ]
  //     })
  //   ]
  // })

  const companyUrlInfo = Skeletons.Box.X({
    className  : `${companyFig}__info_wrapper url-info`,
    kids       : [
      Skeletons.Button.Svg({
        ico       : 'notification',
        className : `${companyFig}__info_wrapper-icon url-info`,
      }),
      Skeletons.Note({
        className   : `${companyFig}__info-text with-icon`,
        content: LOCALE.URL_ADDRESS_CANNOT_CHANGEBLE
      })
    ]
  })

  const urlAddress = Skeletons.Box.X({
    className  : `${companyFig}__wrapper url-address`,
    kids       : [
      Skeletons.Box.X({
        className  : `${companyFig}__row url-address`,
        kids       : [
          Skeletons.Button.Svg({
            ico       : 'desktop_public',
            className : `${companyFig}__icon desktop_public input-wrapper`,
          }),

          Skeletons.EntryBox({
            className   : `${companyFig}__entry with-icon`,
            formItem    : 'url_address',
            placeholder : LOCALE.URL_ADDRESS,
            uiHandler     : _ui_,
            errorHandler  : [_ui_],
            validators    : [
              { reason: LOCALE.DOMAIN_URL_ADDRESS_REQUIRED , comply: Validator.ident }
            ]
          })
        ]
      }),
      
      Skeletons.Note({
        className  : `${companyFig}__note drumee-com input-wrapper`,
        content    : '.drumee.com'
      })
      
    ]
  })

  const nextBtn = require('../../skeleton/common/button').default(_ui_, 'create-company')
  const mgsBox = require('../../skeleton/common/message-box').default(_ui_)

  let a = Skeletons.Box.Y({
    className  : `${companyFig}__items company`,
    debug      : __filename,
    kids       : [
      companyUrlInfo,
      urlAddress,
      nextBtn,
      mgsBox
    ]
  })

  return a;

}

export default __skl_welcome_signup_company