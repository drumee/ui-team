/* ================================================================== *
 * Copyright Xialia.com  2011-2020
 * FILE : /src/drumee/modules/welcome/invitation/skeleton/index.js
 * TYPE : Skeleton
 * ===================================================================**/

// ===========================================================
//
// ===========================================================
function __skl_welcome_invitation_(_ui_) {
  let fig = _ui_.fig.family
  const a = Skeletons.Box.Y({
    className: `${fig}__main`,
    debug: __filename,
    kids: [
      Skeletons.Box.Y({
        className: `${fig}__container`,
        kids: [
          Skeletons.Box.X({
            className: `${fig}__text`,
            kids: [
              Skeletons.Button.Svg({
                ico: "new_wifi-2",
                className: `${fig}__icon`
              }),
              Skeletons.Note({
                className: `${fig}__tips`,
                content: LOCALE.TIPS_OFFLINE
              }),
            ]
          }),
          Skeletons.Note({
            className: `${fig}__button`,
            content: LOCALE.OPEN_LOCAL_FOLDER,
            service: 'open-home-folder'
          })
        ]
      })
    ],
  })

  return a;
};

module.exports = __skl_welcome_invitation_;