/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : desk/invitation/skeleton/main
//   TYPE : Skelton
// ==================================================================== *

// ===========================================================
//
// @return [Object] 
//
// ===========================================================
const __sharees_sharees = function(_ui_) {
  let kids;
  let label = _ui_.label();
  if (label != null) {
    label = Skeletons.Box.X({
      className : `${_ui_.fig.family}__label`,
      kids: [
        Skeletons.Note({
          className : " mb-15",
          content   : label
        })
      ]});
    kids = [label, require("./list")(_ui_)];
  } else { 
    kids = [require("./list")(_ui_)];
  }
  const a = Skeletons.Box.Y({
    debug       : __filename,
    className : `${_ui_.fig.group} ${_ui_.fig.group}__main sharees-roll`,
    kids
  });

  return a;
};
module.exports = __sharees_sharees;
