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
const __invitation_pending = function(_ui_) {
  const a = require('./direct')(_ui_);
  a.shift();
  return a;
};
module.exports = __invitation_pending;
