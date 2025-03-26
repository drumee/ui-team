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
            content    : LOCALE.NEW_ACCOUNT_CREATION
          })
        ]
      }),

      Skeletons.Box.X({
        className  : `${pfx}__text-container`,
        kids       : [
          Skeletons.Note({
            className  : `${pfx}__text`,
            content    : cur.printf(LOCALE.CROSS_SIGNED_UP.format(Visitor.profile().email)),
          }),
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
                content    : LOCALE.PROCEED_TO_SIGNUP,
                service    : 'close-current-connection',
              })
            ]
          }),
          Skeletons.Box.X({
            className  : `${pfx}__button`,
            kids:[
              Skeletons.Note({
                className  : `${pfx}__choice`,
                content    : LOCALE.KEEP_CONNECTION_VALIDATE_LATER,
                service    : 'keep-current-connection',
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
