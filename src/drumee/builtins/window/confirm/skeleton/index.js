/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/window/addressbook/widget/contact-form/skeleton/tags.coffee
//   TYPE : Skelton
// ===================================================================**/

const __skl_window_confirm = function(_ui_, content, mode) {
  if (mode == null) { mode = "hbfc"; }
  mode = _ui_.mget(_a.mode) || mode;
  const pfx = `${_ui_.fig.group}-confirm`;
  const header = Skeletons.Box.X({
    className : `${pfx}__topbar ${_ui_.fig.group}__topbar XXX`, 
    kids : [require('./header')(_ui_)]});

  const body = content || _ui_.mget(_a.body);
  if(body) {
    if (_.isFunction(body)) {
      content = body(_ui_);
    } else {
      content = body;
    }
  } else {
    content = require('./body')(_ui_);
  }

  const m = new RegExp(`[${mode}]`);
    
  const a = Skeletons.Box.Y({
    className  : `${pfx}__main ${_ui_.fig.group}__modal`,
    radio      : _a.parent,
    debug      : __filename,
    kids       : []});

  if (m.test('h')) {
    a.kids.push(header);
  }
  if (m.test('b')) {
    if (_.isArray(content)) {
      a.kids = content;
    } else {
      a.kids.push(content);
    }
  }
  if (m.test('f')) {
    a.kids.push(require('./footer')(_ui_, mode));
  }
    
  return a;
};

module.exports = __skl_window_confirm;
