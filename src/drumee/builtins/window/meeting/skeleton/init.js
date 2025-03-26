// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : src/drumee/builtins/window/channel/
//   TYPE : Skelton
// ==================================================================== *

const __webrtc_init = function(_ui_) {
  const mode = _ui_.mget(_a.mode) || "";
  const area = _ui_.mget(_a.area);
  const role = _ui_.mget(_a.role);
  const header = Skeletons.Box.X({
    className : `${_ui_.fig.family}__header ${_ui_.fig.group}__header ${mode} ${area}`, 
    kids     : [require('./topbar')(_ui_)],
    sys_pn   : _a.header,
    dataset   : {
      header  : _ui_.mget(_a.header),
      area,
      mode
    }
  });
    
    
  const body = Skeletons.Box.Y({
    className: `${_ui_.fig.family}__body ${_ui_.fig.group}__body`,
    sys_pn   : _a.content,
    dataset   : {
      header  : _ui_.mget(_a.header)
    },
    kids:[
      Skeletons.Wrapper.Y({
        sys_pn    : "message-container",
        className : `${_ui_.fig.group}__message-container ${_ui_.fig.family}__message-container`,
        partHandler : [_ui_]})
    ]});
    

  const a = Skeletons.Box.Y({
    debug       : __filename,
    className   : `${_ui_.fig.family}__main`, 
    kids        : [header, body]});

  return a;
};

module.exports = __webrtc_init;