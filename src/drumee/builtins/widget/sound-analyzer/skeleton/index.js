// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/widget/sound-analyzer/skeleton/index.coffee
//   TYPE : Skelton
// ===================================================================**/

// ===========================================================
//
// ===========================================================
const __skl_sound_analyzer = function(_ui_) {
  const a = Skeletons.Box.Y({
    className  : `${_ui_.fig.family}__main`,
    debug      : __filename,
    kids       : [
      Skeletons.Element({
        tagName   : 'canvas',
        className : `${_ui_.fig.family}__content`,
        sys_pn    : 'canvas',
        attributes: {
          id      : `${_ui_._id}-canvas`
        }
      })
    ]});

  return a;
};
module.exports = __skl_sound_analyzer;