// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/skeleton/tick-box/radio
//   TYPE : 
// ==================================================================== *

// ======================================================
// Radio box
// ======================================================

// ===========================================================
// __tbx_radio
//
// @param [Object] model
// @param [Object] label
//
// @return [Object] 
//
// ===========================================================
const __tbx_radio = function(model, label) {
  const a = {
    kind:KIND.bit.radio,
    cmArgs: {
      templateName: model.get(_a.template),
      className  : model.get(_a.className),
      active     : model.get(_a.active),
      flow       : model.get(_a.flow)
    },
    signal     : model.get(_a.signal),
    name  : model.get(_a.name),
    label : _LOCALE(label),
    bits:require('./items')(model)
  };
  return a;
};
module.exports = __tbx_radio;