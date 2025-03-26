// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/webrtc/endpoint/skeleton/index.coffee
//   TYPE : Skelton
// ===================================================================**/

// ===========================================================
//
// ===========================================================
const __skl_window_connect_loading = function(_ui_) {

  const header = Skeletons.Box.X({
    className : `${_ui_.fig.family}__header ${_ui_.fig.group}__header`, 
    kids     : [require('./topbar')(_ui_)],
    sys_pn   : _a.header
  });

  const body = Skeletons.Box.Y({
    className: `${_ui_.fig.family}__body`,
    sys_pn   : _a.content,
    kids:[
      Skeletons.Box.Y({
        className : `${_ui_.fig.family}__avatar-container`,
        kids:[
          Skeletons.Profile({
            className : `${_ui_.fig.family}__avatar`,
            type:'thumb',
            id: _ui_.peer_id, 
            active:0, 
            dataset : {
              active : 0
            }
          })
        ]}),
      Skeletons.Note({
        className : `${_ui_.fig.family}__uname`,
        sys_pn    : "uname",
        content   : _ui_.mget('uname')
      }),
      require('./status')(_ui_),
      require('./commands')(_ui_)
    ]});

  const a = Skeletons.Box.Y({
    debug       : __filename,
    className   : `${_ui_.fig.family}__main`, 
    kids        : [
      header,
      body
      // message
    ]});

  return a;
};
module.exports = __skl_window_connect_loading;