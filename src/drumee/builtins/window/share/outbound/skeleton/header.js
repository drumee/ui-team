// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *


// ===========================================================
// __sb_outbound_tab
//
// @param [Object] desk_ui
//
// @return [Object]
//
// ===========================================================
const __sb_outbound_tab = function(_ui_, name) {
  let a;
  if (_ui_.mget(_a.mode) === 'direct') {
    a = [Skeletons.Note(LOCALE.CREATE_ACCESSES)];
  } else { 
    a = [Skeletons.Note(LOCALE.ACCESS_LIST)];
  }
  return a;
};
module.exports = __sb_outbound_tab;
