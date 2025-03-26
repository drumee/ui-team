// ===========================================================
//
// ===========================================================
const __webrtc_remote_endpoint = function(_ui_, data) {
  const a = { 
    kind     : 'webrtc_endpoint_remote',
    label    : data.firstname || data.lastname || data.email,
    audio    : _ui_.mget(_a.audio),
    video    : _ui_.mget(_a.video),
    uiHandler : [_ui_],
    role      : _ui_.mget(_a.role),
    hub_id    : _ui_.mget(_a.hub_id),
    protocol  : _ui_.service_class,
    logicalParent : _ui_,
    socket    : _ui_.socket, 
    ssid      : data.ssid
  };
    
  return a;
};
module.exports = __webrtc_remote_endpoint;
