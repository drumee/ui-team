/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/skeleton/form/identity
//   TYPE : 
// ==================================================================== *

// ============================================
//
// ============================================
dui.reqres.setHandler(_REQ.ui.form.identity, () => [{
  name: _a.firstname,
  kind: KIND.entry,
  picto: _p.user,
  placeholder : LOCALE.FIRSTNAME,
  require:_a.string
},{
  name: _a.lastname,
  kind: KIND.entry,
  picto: _p.user,
  placeholder : LOCALE.LASTNAME,
  require:_a.string
},{
  name: _a.ident,
  kind: KIND.entry,
  picto: _p.user,
  placeholder : LOCALE.USERNAME,
  require:_a.ident,
  allow: _a.ident,
  exclude: {
    method  : _RPC.req.ident_exists
  }
  //allow2:'-_.'
},{
  name : _a.email,
  type : _a.text,
  picto: _p.email,
  placeholder : LOCALE.EMAIL,
  require:_a.email,
  allow: _a.email,
  exclude: {
    method: _RPC.req.email_exists
  }
  //allow2:'-_.@'
},{
  name: "email_ck",
  same: _a.email,
  kind: KIND.entry,
  picto: _p.check_circle,
  placeholder : LOCALE.EMAIL_CHECK,
  require:_a.email,
  allow: _a.email,
  //allow2:'-_.@'
},{
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
}]);
