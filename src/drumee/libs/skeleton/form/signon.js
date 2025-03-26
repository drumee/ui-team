/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/skeleton/form/signon
//   TYPE : 
// ==================================================================== *

// ============================================
// Inputs definition for signon form
// ============================================
dui.reqres.setHandler(_REQ.ui.form.signon, key => [{
  name: "pw",
  type: _a.password,
  picto: _p.key,
  placeholder : LOCALE.PASSWORD,
  require:_a.string
},{
  name: "pw_ck",
  same:"pw",
  type: _a.password,
  picto: _p.check_circle,
  placeholder : LOCALE.PASSWORD_CHECK,
  require:_a.string
},{
  name: _a.key,
  type: _a.hidden,
  value:key,
  require:_a.none
}]);
