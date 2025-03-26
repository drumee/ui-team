// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/webrtc/screen/skeleton/index.coffee
//   TYPE : Skelton
// ===================================================================**/

// ===========================================================
//
// ===========================================================
const __skl_stream_remote_loading = function (_ui_) {

  const a = Skeletons.Box.Y({
    className: `${_ui_.fig.family}__main`,
    debug: __filename
  });
  if (_ui_.mget('peer')) {
    const peer = [Skeletons.Note({
      sys_pn: _a.label,
      content: "",
      className: `${_ui_.fig.family}__label remote`
    }), {
      ..._ui_.mget('peer'),
      type: 'thumb',
      active: 0,
      kind: KIND.profile,
      className: `${_ui_.fig.family}__avatar no-online-status ${_ui_.fig.group}__avatar`
    }];

    a.kids = peer;
  }
  return a;
};
module.exports = __skl_stream_remote_loading;