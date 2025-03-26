// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : desk/counter/project/skeleton/main
//   TYPE : Skelton
// ==================================================================== *

// ===========================================================
// __tooltips_message
//
// @param [Object] _ui_
//
// @return [Object] 
//
// ===========================================================
const __tooltips_message = function(_ui_, content) {
  const a = Skeletons.Note({
    className  : `mb-20 ${_ui_.fig.group}-tooltips__message`,
    uiHandler  : _ui_,
    debug      : __filename,
    content, 
    state      : 0
  });
  return a;
};
module.exports = __tooltips_message;
