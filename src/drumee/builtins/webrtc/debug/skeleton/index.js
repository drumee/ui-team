// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : src/drumee/builtins/window/channel/
//   TYPE : Skelton
// ==================================================================== *

const __skl_webrtc = function(_ui_) {
  const lense = { 
    kind          : 'webrtc_endpoint_lense',
    className     : `${_ui_.fig.family}__endpoint-lense`,
    sys_pn        : 'endpoint-lense',
    label         : _ui_.mget('ring_label'),
    mute          : 1,
    persistence   : _a.always
  };

  const local_endpoint = { 
    mute        : 1, // To avoid Larsen
    kind        : 'webrtc_endpoint_local',
    label       : LOCALE.ME,
    audio       : _ui_.mget(_a.audio),
    video       : _ui_.mget(_a.video)
  };

  const a = Skeletons.Box.Y({
    debug       : __filename,
    className   : `${_ui_.fig.family}__main`, 
    sys_pn      : "main",
    kids        : [
      Skeletons.List.Smart({
        className   : `${_ui_.fig.family}__endpoints-container`,
        flow        : _a.x, 
        axis        : _a.x, 
        sys_pn      : "endpoints-container",
        state       : 0
      }),
        
      Skeletons.Box.X({ 
        className: `${_ui_.fig.family}__container`,
        sys_pn      : "container",
        kids  : [
          lense, 
          Skeletons.Box.X({ 
            className: `${_ui_.fig.family}__endpoint-local`,
            sys_pn   : "endpoint-local",
            kids     : [local_endpoint]}),
          require('./commands')(_ui_)
        ]})
    ]});
  return a; 
};
module.exports = __skl_webrtc;