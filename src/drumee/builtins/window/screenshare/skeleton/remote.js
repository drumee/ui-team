// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : src/drumee/builtins/window/channel/
//   TYPE : Skelton
// ==================================================================== *

const __skl_screenshare = function(_ui_, data) {

  const header = Skeletons.Box.X({
    className : `${_ui_.fig.family}__header ${_ui_.fig.group}__header`, 
    kids     : [require('./topbar')(_ui_, data.uname)],
    sys_pn   : _a.header,
    dataset   : {
      area    : _ui_.mget(_a.area),
      connection: Visitor.get('connection')
    }
  });
    

  const body = Skeletons.Box.Y({
    className: `${_ui_.fig.family}__body`,
    sys_pn   : _a.content,
    kids        : [
      require('builtins/webrtc/skeleton/remote-display')(_ui_, data)
    ]});

  const a = Skeletons.Box.Y({
    debug       : __filename,
    className   : `${_ui_.fig.family}__main`, 
    kids        : [header, body],
    dataset   : {
      area    : _ui_.mget(_a.area),
      connection: Visitor.get('connection')
    }
  });

  return a;
};

module.exports = __skl_screenshare;