
const { toggleState } = require("core/utils")
const __webrtc_remote_user = function(_ui_, data, service) {
  const a = {
    kind      : 'webrtc_remote_user',
    screen    : toggleState(_ui_.mget(_a.screen)),
    uiHandler : [_ui_],
    hub_id    : _ui_.mget(_a.hub_id),
    nid       : _ui_.mget(_a.nid) || _ui_.mget(_a.room_id),
    room_id   : _ui_.mget(_a.room_id),
    logicalParent : _ui_,
    ...data,
    service,
    service_class : _ui_.mget('service_class')
  };
  return a;
};
module.exports = __webrtc_remote_user;
