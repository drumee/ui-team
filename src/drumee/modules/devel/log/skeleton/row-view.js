/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : builtins/admin/skeleton/locale/row-view
//   TYPE : 
// ==================================================================== *


// ===========================================================
//
// ===========================================================
const __log_row = function(_ui_, data) { 
  const a = [];
  for (var d of Array.from(data)) {
    a.push(Skeletons.Box.X({
      className: `${_ui_.fig.family}__row`,
      debug : __filename,
      state : 1,
      name : d, 
      kids  : [
        Skeletons.Note(d, `${_ui_.fig.family}__text`),
        Skeletons.Button.Svg({
          ico : d, 
          className : `${_ui_.fig.family}__icon`
        })
      ]}));
  }
  return a;
};
module.exports = __log_row;
