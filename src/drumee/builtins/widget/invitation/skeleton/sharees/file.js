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
const __sharees_sharebox = function(_ui_) {
  const a = Skeletons.Box.X({
    debug       : __filename,
    className : `${_ui_.fig.group} ${_ui_.fig.group}__main sharees-roll`,
    kids: [require("./list")(_ui_)]
  });

  return a;
};
module.exports = __sharees_sharebox;
