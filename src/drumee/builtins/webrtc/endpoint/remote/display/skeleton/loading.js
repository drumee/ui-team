// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/webrtc/screen/skeleton/index.coffee
//   TYPE : Skelton
// ===================================================================**/

// ===========================================================
//
// ===========================================================
const __skl_stream_remote_loading = function(_ui_) {
  const a = Skeletons.Box.Y({
    className  : `${_ui_.fig.family}__main`,
    debug      : __filename,
    kids       : [
      Skeletons.Note({
        sys_pn    : _a.label,
        content   : `${_ui_.mget(_a.username)} has started sharing screen`,
        className : `${_ui_.fig.family}__label remote`
      })
    ]});
  return a;
};
module.exports = __skl_stream_remote_loading;