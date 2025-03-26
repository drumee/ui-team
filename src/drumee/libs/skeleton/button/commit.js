/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : src/drumee/builtins/editor/skeleton/button/commit
//   TYPE : 
// ==================================================================== *


// ===========================================================
// __editor_skl_button_ok
//
// @param [Object] label
//
// @return [Object] 
//
// ===========================================================
const __editor_skl_button_commit = function(view, signal, label, ext) {
  //handler = view || Panel
  //_dbg "KSKKSKSKSKSKS", signal
  if (signal == null) { signal = _e.ui.event; }
  if (label == null) { label = LOCALE.OK; }
  ext = ext || {};
  const extClass = "editbox-button editbox-button--equal editbox-button--ok"; //|| ext.className
  //_dbg "KSKKSKSKSKSKS__editor_skl_button_commit", ext, extClass
  const a  = {
    kind      : KIND.note,
    className : extClass,
    content   : label,
    signal,
    service   : _e.commit,
    // #variant   : _a.text
    // templateName: _T.wrapper.note
    handler: {
        ui: view
      }
  };
  if (ext) {
    _.merge(a, ext);
  }
  if (__BUILD__ === 'dev') { DBG_PATH(a, 'editor/skeleton/button/commit'); }
  return a;
};
module.exports = __editor_skl_button_commit;
