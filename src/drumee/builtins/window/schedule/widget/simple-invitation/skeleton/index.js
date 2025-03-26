/* ================================================================== *
 * Copyright Xialia.com  2011-2020
 * FILE : src/drumee/builtins/window/sharebox/widget/invitation-email/skeleton/index.js
 * TYPE : Skelton
 * ===================================================================**/

/*
*
*/
function __skl_invitation_email (_ui_) {
  let footer = null;
  if(_ui_.mode == _a.edit) {
    footer = Skeletons.Box.X({
      className  : `${_ui_.fig.family}__footer`,
      kids: [
        require('./email-input').default(_ui_)
      ]
    })
    
  }

  let a = Skeletons.Box.Y({
    className  : `${_ui_.fig.family}__main`,
    debug      : __filename,
    kids       : [
      Skeletons.Box.Y({
        className  : `${_ui_.fig.family}__container`,
        kids : [
          Skeletons.Box.X({
            className  : `${_ui_.fig.family}__body`,
            kids: [
              require('./email-list').default(_ui_)
            ]
          }),
          footer
        ]
      })
    ]
  })
  return a;
}
export default __skl_invitation_email;
