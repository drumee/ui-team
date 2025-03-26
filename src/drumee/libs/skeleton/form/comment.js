/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/skeleton/form/comment
//   TYPE : 
// ==================================================================== *

// ==================================
// Inputs definition for login pad
// ==================================
dui.reqres.setHandler(_REQ.ui.form.login, () => [{
  name: _a.ident,
  kind: KIND.entry,
  picto: _p.user,
  placeholder: LOCALE.USERNAME,
  require:"email_or_id",
},{
  name: _a.password,
  kind: KIND.entry.password,
  picto: _p.key,
  placeholder: LOCALE.PASSWORD,
  require:"any"
}]);
// ============================================
// form.content
// ============================================
dui.reqres.setHandler(_REQ.ui.form.comment, model => [{
    name: _a.content,
    kind: KIND.entry,
    picto: _p.pencil,
    placeholder : LOCALE.COMMENTS,
    require:_a.string,
  },
  {
    name: _a.ownerId,
    kind: KIND.entry,
    value: 'value', //model.get(_a.ownerId)
    picto: _p.pencil,
    require:_a.ident,
    placeholder : '',
}]);
