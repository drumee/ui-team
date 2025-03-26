/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/skeleton/form/register
//   TYPE : 
// ==================================================================== *

// ============================================
//
// ============================================
dui.reqres.setHandler(_REQ.ui.form.register, () => [{
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
}]);
