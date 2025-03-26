// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : src/drumee/libs/skeleton/profile
//   TYPE : 
// ==================================================================== *


// ===========================================================
// __skl_profile
//
// @param [Object] ma,ager
//
// @return [Object] 
//
// ===========================================================
const __skl_profile = function(manager) {
  const a = { 
    kind:KIND.box,
    flow:_a.vertical,
    sys_pn: _a.photo,
    'z-index' : 10,
    className : `profile-inner ${manager.model.get(_a.type)}`
  };
  if (__BUILD__ === 'dev') { DBG_PATH(a, 'libs/skeleton/profile'); }  
  return a;
};
module.exports = __skl_profile;