/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/skeleton/tick-box/items
//   TYPE : 
// ==================================================================== *

  // ============================================
  //
  // ============================================

// ===========================================================
// __tbx_items
//
// @param [Object] model
//
// @return [Object] 
//
// ===========================================================
const __tbx_items = function(model) {
  let states, value;
  const def = require('./label')(model);
  const res = [];
  let j = 0;
  let s = _K.string.empty;
  if (_.isFinite(value)) {
    value = parseInt(model.get(_a.value));
  } else {
    value = model.get(_a.value);
  }
  if (value >= Math.pow(2,def.length)) {
    value = Math.pow(2,def.length) - 1;
  }
  if (def != null) {
    for (var d of Array.from(def)) {
      if ((d.value === value) || (d.bin & value)) {
        s = s.concat(_K.string.one);
      } else {
        s = s.concat(_K.string.zero);
      }
    }
    states = s.split(_K.string.empty);
  } else {
    const val = parseInt(value);
    states = val.toString(2).split(_K.string.empty);
  }
  //_dbg ">>>qqq tick_box.labels", value, states, model
  for (var i of Array.from(states)) {
    var el = {
      state  : i,
      label  : _LOCALE(def[j].label),
      value  : def[j].value
    };
    if (def[j].pictos != null) {
      el.pictos = def[j].pictos;
    }
    res.push(el);
    j++;
  }
  //_dbg ">>>qqq tick_box.labels states", res
  return res;
};
module.exports = __tbx_items;