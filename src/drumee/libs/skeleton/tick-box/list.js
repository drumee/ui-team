// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/skeleton/tick-box/list
//   TYPE : 
// ==================================================================== *

// ======================================================
// Multiple choice
// ======================================================

// ===========================================================
// __tbx_list
//
// @param [Object] model
// @param [Object] label
//
// @return [Object] 
//
// ===========================================================
const __tbx_list = function(model, label) {
  const a = {
    kind:KIND.bit.list,
    cmArgs: {
      templateName: model.get(_a.template),
      className  : model.get(_a.className),
      active     : model.get(_a.active),
      flow       : model.get(_a.flow)
    },
    name  : model.get(_a.name),
    label : _LOCALE(label),
    active: model.get(_a.flow),
    bits:require('./items')(model)
  };
  return a;
};
module.exports = __tbx_list;