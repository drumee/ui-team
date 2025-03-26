// ================================================================== *
//   Copyright Xialia.com  2011-2023
//   FILE : /src/drumee/builtins/widget/background-image/skeleton/index.js
//   TYPE : Skelton
// ===================================================================**/

/**
 * 
 * @param {*} _ui_ 
 * @returns 
 */
function __skl_drumee_background(_ui_) {
  let fig = _ui_.fig.family;
  const a = Skeletons.Box.Y({
    className: `${fig}__main`,
    debug: __filename,
    sys_pn: "main",
    kids: [
      Skeletons.Box.Y({
        sys_pn: 'preview',
        className: `${fig}__wrapper preview`,
      }),
      Skeletons.Box.Y({
        sys_pn: 'overlay',
        className: `${fig}__wrapper overlay`,
      }),
    ]
  })

  return a;
}
module.exports = __skl_drumee_background;