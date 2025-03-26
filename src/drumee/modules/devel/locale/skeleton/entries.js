/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *

// ===========================================================
// _form (local-row)
//
// @param [Object] _ui_
//
// ===========================================================


const __locale_entries = function(_ui_) {
  const a = [
    Skeletons.Entry({
      className    : `${_ui_.fig.family}__field key`,
      name         : "key_code",
      placeholder  : "key",
      sys_pn       : "main-keycode",
      mode         : _a.interactive,
      bubble       : 1,
      service      : "lookup-key",
      type         : _a.textarea
    }),
    Skeletons.Wrapper.Y({
      sys_pn : 'results-wrapper',
      className: `${_ui_.fig.family}__results-container`
    })
  ];

  for (var l of Array.from(Platform.get('intl'))) {
    var b = Skeletons.Entry({
      className    : `${_ui_.fig.family}__field value`,
      name         : l,
      lng          : l,
      field        : `entry-${l}`,
      placeholder  : l,
      type         : _a.textarea
    });
    a.push(b);
  }

  a.push(Skeletons.Wrapper.Y({
    sys_pn : 'confirm-wrapper',
    className: `${_ui_.fig.family}__confirm-container`
  })
  );

  return a;
};

module.exports = __locale_entries;
