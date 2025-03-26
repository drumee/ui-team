/* ================================================================== *
 * Copyright Xialia.com  2011-2020
 * FILE : /src/drumee/modules/welcome/signin/skeleton/otp.js
 * TYPE : Skeleton
 * ===================================================================**/

// ===========================================================
//
// ===========================================================

function __skl_welcome_cross_signin (_ui_, data={}) {
  const pfx = `${_ui_.fig.family}-cross-signin`

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
            content    : LOCALE.MULTIPLE_CONNECTION
          })
        ]
      }),

      Skeletons.Box.X({
        className  : `${pfx}__text-container`,
        kids       : [
          Skeletons.Note({
            className  : `${pfx}__text`,
            content    : cur.printf(LOCALE.CROSS_SIGNED_IN),
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
                content    : LOCALE.CLOSE_CURRENT_CONNECTION.format(cur, input),
                service    : 'close-current-connection',
              })
            ]
          }),
          Skeletons.Box.X({
            className  : `${pfx}__button`,
            kids:[
              Skeletons.Note({
                className  : `${pfx}__choice`,
                content    : LOCALE.KEEP_CURRENT_CONNECTION.format(cur, input),
                service    : data.service || 'keep-current-connection',
              })
            ]
          })
        ]
      })
    ]
  })

  return a;
};

module.exports =  __skl_welcome_cross_signin;
