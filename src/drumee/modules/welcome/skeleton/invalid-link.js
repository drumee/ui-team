/* ================================================================== *
 * Copyright Xialia.com  2011-2020
 * FILE : /src/drumee/modules/welcome/signin/skeleton/otp.js
 * TYPE : Skeleton
 * ===================================================================**/

// ===========================================================
//
// ===========================================================

function __skl_welcome_multiple_signin (_ui_, data={}) {
  const pfx = `${_ui_.fig.family}-multiple-sessions`

  let cur = data.current || '';
  let input = data.input || '';
  
  const a = Skeletons.Box.Y({
    debug     : __filename,
    className  : `${pfx}__container`,
    kids       : [
      Skeletons.Box.X({
        className  : `${pfx} title`,
        kids       : [
          Skeletons.Note({
            className  : `${pfx}__title`,
            content    : LOCALE.INVALID_LINK
          })
        ]
      }),

      Skeletons.Box.X({
        className  : `${pfx}__buttons`,
        kids       : [
          Skeletons.Box.X({
            className  : `${pfx}__button`,
            kids:[
              Skeletons.Note({
                className  : `${pfx}__choice`,
                content    : LOCALE.HOMEPAGE,
                href       : _K.module.welcome
              })
            ]
          }),
          Skeletons.Box.X({
            className  : `${pfx}__button`,
            kids:[
              Skeletons.Note({
                className  : `${pfx}__choice`,
                content    : LOCALE.SIGN_IN,
                href       : _K.module.welcome
              })
            ]
          })
        ]
      })
    ]
  })

  return a;
};

export default __skl_welcome_multiple_signin
