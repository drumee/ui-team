// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/webrtc/endpoint/skeleton/index.coffee
//   TYPE : Skelton
// ===================================================================**/

// ===========================================================
//
// ===========================================================
const __skl_window_connect = function(_ui_, localUser, peer) {

  const header = Skeletons.Box.X({
    className : `${_ui_.fig.family}__header ${_ui_.fig.group}__header`, 
    kids     : [require('./topbar')(_ui_)],
    sys_pn   : _a.header
  });


  const body = require('builtins/webrtc/skeleton')(_ui_, localUser, peer);


  const a = Skeletons.Box.Y({
    debug       : __filename,
    className   : `${_ui_.fig.family}__main`, 
    kids        : [header, body]
  });

  return a;
};
module.exports = __skl_window_connect;

