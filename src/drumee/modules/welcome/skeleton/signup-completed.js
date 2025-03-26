/* ================================================================== *
 * Copyright Xialia.com  2011-2020
 * FILE : /src/drumee/modules/welcome/signin/skeleton/otp.js
 * TYPE : Skeleton
 * ===================================================================**/

// ===========================================================
//
// ===========================================================

function __skl_welcome_signup_done (_ui_, data={}) {
  const pfx = `${_ui_.fig.family}-multiple-sessions`

  
  const a = Skeletons.Box.Y({
    debug     : __filename,
    className  : `${pfx}__container`,
    kids       : [
      Skeletons.Box.X({
        className  : `${pfx} title`,
        kids       : [
          Skeletons.Note({
            className  : `${pfx}__title`,
            content    : LOCALE.CONGRATULATIONS
          })
        ]
      }),

      Skeletons.Box.X({
        className  : `${pfx}__text-container`,
        kids       : [
          Skeletons.Note({
            className  : `${pfx}__text`,
            content    : LOCALE.DRUMEE_DESK_OPENING
          }),
        ]
      }),
      
      {kind:'spinner'}
    ]
  })

  return a;
};

export default __skl_welcome_signup_done
