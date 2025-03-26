// ================================================================== *
//   Copyright Xialia.com  2011-2024
//   FILE : /src/drumee/builtins/widget/logo/skeleton/index.js
//   TYPE : Skelton
// ===================================================================**/

/**
 * 
 * @param {*} _ui_ 
 * @returns 
 */

function __skl_custom_logo(_ui_) {
  let state = 0;
  if (_ui_.mget(_a.label)) {
    state = 1;
  }
  const a = Skeletons.Box.Y({
    className: `${_ui_.fig.family}__main`,
    debug: __filename,
    kids: [
      Skeletons.Box.Y({
        className: `${_ui_.fig.family}__container`,
        kids: [
          Skeletons.Box.X({
            active: 0,
            sys_pn: "logo-block",
            className: `${_ui_.fig.family}__image`,
          }),
          Skeletons.Note({
            className: `${_ui_.fig.family}__text`,
            content: _ui_.mget(_a.label),
            state,
          }),
        ]
      })
    ]
  })
  return a;
}
module.exports = __skl_custom_logo;