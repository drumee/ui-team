/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/skeleton/button/anchor
//   TYPE : 
// ==================================================================== *

// ============================================
//
// ============================================

// ===========================================================
// _exported
//
// @param [Object] key
//
// @return [Object] 
//
// ===========================================================
const _exported = function(key, ext) {
  if (key == null) { key = 'blank'; }
  const a = {
    home: {
      label: _K.string.empty,
      picto:_p.home,
      url: _K.string.empty
    },
    logout: {
      picto  : _p.power_off,
      url    : _K.route.private.logout
    },
    blank: {
      picto  : _K.char.empty,
      url    : _K.char.empty
    }
  };
  a[key] = a[key] || {};
  a[key].kind = KIND.button.anchor;
  if (_.isObject(ext)) {
    _.extend(a[key], ext);
  }
  return a[key];
};
module.exports = _exported;