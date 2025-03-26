/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : desk/window/share-box/skeleton/main
//   TYPE : Skelton
// ==================================================================== *
const __skl_sharebox = function(_ui_) {
  const menu = Skeletons.Box.X({
    // cn : "drive-popup__bar--special drive-popup__bar--sharebox u-jc-sb"
    debug     : __filename,
    className : `${_ui_.fig.family}__header ${_ui_.fig.group}__header`, 
    kids : [require('./top-bar')(_ui_)]
  });
  const a = require('window/skeleton/content/main')(_ui_, menu);
  a.debug = __filename;
  if (_ui_._shared != null) {
    a.kids.push(Skeletons.Box.X({
      className :`${_ui_.fig.family}__spinner`,
      kids : [
        Skeletons.Note({
          className :_C.spinner
        })
      ],
      wrapper : 1,
      sys_pn : _a.spinner
    })
    );
  }

  return a;
};
module.exports = __skl_sharebox;
