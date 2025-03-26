/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/skeleton/form/password
//   TYPE : 
// ==================================================================== *

// ============================================
// Inputs definition for resetting password form
// ============================================
dui.reqres.setHandler(_REQ.ui.form.password, model => [
  dui.request(_r.ui.entry.options, _a.password, model),
  dui.request(_r.ui.entry.options, _a.password_check, model),
  dui.request(_r.ui.entry.hidden, _a.key, model),
  dui.request(_r.ui.entry.hidden, _a.answer, model),
]);
