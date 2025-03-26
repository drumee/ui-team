/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/skeleton/form/base
//   TYPE : 
// ==================================================================== *

// ==================================================================== *
  // ============================================
  // Submenu widget for entering padding/margin
  // ============================================

// ===========================================================
// _exported
//
// @param [Object] view
// @param [Object] api
// @param [Object] fields
// @param [Object] style
//
// ===========================================================
const _exported = function(view, api, fields, style) {
  let a;
  const styleOpt = {
    width   : _K.size.full,
    height  : _a.auto
  };
  if (style) {
    _.merge(styleOpt, style);
  }
  return a = {
    kind:KIND.form,
    flow:_a.vertical,
    persistence: _a.self,
    showIn      : _a.modal,
    api,
    className   : "form-wrapper",
    handler     : {
      api       : view
    },
    scope       : _a.bulk,
    kids:[{
      kind    : KIND.box,
      flow      : _a.vertical,
      className : 'form-body',
      sys_pn  : _a.body,
      styleOpt,
      kids      : fields
    },{
      kind    : KIND.box,
      flow      : _a.horizontal,
      className : 'form-footer',
      sys_pn  : _a.footer,
      justify   : _a.center,
      service   : _a.save_as,
      kids      : [
        SKL_Button_Trigger(_a.cancel, null, {className: "flow-h cancel", signal:_e.cancel}),
        SKL_Button_Trigger(_a.submit, null, {className: "flow-h submit", signal:_e.submit}),
      ]
    }]
  };
};
module.exports = _exported;