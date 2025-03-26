/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : builtins/admin/skeleton/locale/row-_ui_
//   TYPE : 
// ==================================================================== *


// ===========================================================
// __locale_item
//
// @param [Object] ext
//
// ===========================================================
const __locale_item = function(_ui_) { 
  const name = '';
  const pfx = _ui_.fig.family;

  const a = Skeletons.Box.Y({
    className: `${pfx}__container`,
    initialState: 0,
    kids: []
  });

  for (var l of Array.from(Platform.get('intl'))) {
    var data =  _ui_.mget(l) || {};
    var b = Skeletons.Note({
      className: `${pfx}__translation`,
      value: data.des,
      id : data.id,
      key_code : _ui_.mget('key_code'),
      name: l,
      dataset: {
        name: l
      }
    });
    a.kids.push(b);
  }

  return a;
};
module.exports = __locale_item;
