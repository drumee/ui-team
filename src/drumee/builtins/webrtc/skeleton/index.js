const { toggleState } = require("core/utils")
/**
 * 
 * @param {*} _ui_ 
 * @param {*} localUser 
 * @param {*} peer 
 * @returns 
 */
const __webrtc_body = function (_ui_, localUser, peer) {
  const presenter = Skeletons.Box.Y({
    className: `${_ui_.fig.family}__presenter ${_ui_.fig.group}__presenter`,
    sys_pn: 'presenter',
    service_class: _ui_.mget('service_class'),
    audio: _ui_.mget(_a.audio),
    video: _ui_.mget(_a.video),
    hub_id: _ui_.mget(_a.hub_id),
    room_id: _ui_.mget(_a.id),
    screen: toggleState(_ui_.mget(_a.screen)),
    wrapper: 1,
    logicalParent: _ui_,
    partHandler: [_ui_]
  });
  const participants = {
    kind: 'webrtc_participants',
    sys_pn: 'participants',
    service_class: _ui_.mget('service_class'),
    audio: _ui_.mget(_a.audio),
    video: _ui_.mget(_a.video),
    hub_id: _ui_.mget(_a.hub_id),
    room_id: _ui_.mget(_a.room_id),
    screen: toggleState(_ui_.mget(_a.screen)),
    localUser,
    logicalParent: _ui_,
    partHandler: [_ui_],
    uiHandler: [_ui_]
  };

  if (peer) {
    peer = [{
      ...peer,
      type: 'thumb',
      active: 0,
      kind: KIND.profile,
      className: `${_ui_.fig.family}__avatar no-online-status ${_ui_.fig.group}__avatar`,
    }, Skeletons.Note({
      className: `message-text`,
      content: LOCALE.CONNECTING,
    })];
  }
  const a = Skeletons.Box.Y({
    className: `${_ui_.fig.family}__body ${_ui_.fig.group}__body singleton`,
    sys_pn: _a.content,
    kids: [
      Skeletons.Box.G({
        className: `${_ui_.fig.family}__endpoints ${_ui_.fig.group}__endpoints`,
        sys_pn: 'endpoints',
        kids: [presenter, participants]
      }),

      Skeletons.Wrapper.Y({
        sys_pn: "message-container",
        className: `${_ui_.fig.group}__message-container ${_ui_.fig.family}__message-container`,
        partHandler: [_ui_],
      }),

      Skeletons.Wrapper.Y({
        sys_pn: "peer-container",
        className: `${_ui_.fig.group}__peer-container ${_ui_.fig.family}__peer-container`,
        partHandler: [_ui_],
        kids: peer
      }),

      Skeletons.Wrapper.Y({
        sys_pn: "timer-container",
        partHandler: [_ui_],
        className: `${_ui_.fig.group}__timer-container ${_ui_.fig.family}__timer-container`,
        state: 0
      }),

      require('./commands')(_ui_),
      require('./overlay-wrapper').default(_ui_),
    ]
  });
  return a;
};
module.exports = __webrtc_body;
