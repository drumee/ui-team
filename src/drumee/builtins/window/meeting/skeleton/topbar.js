const __window_meeting_topbar = function (_ui_) {
  const { filename } = _ui_.model.get('details') || {};
  const name = filename || _ui_.model.get(_a.filename) || "";

  const figname = "topbar";
  let chat = Skeletons.Button.Svg({
    ico: 'tchat',
    service: _a.chat,
    className: `${_ui_.fig.family}-${figname}__icon`
  });

  let notification = Skeletons.Note({
    className: `${_ui_.fig.family}__${figname}-notification ${_ui_.mget(_a.mode)}`,
    content: _ui_.mget('new_chat'),
    sys_pn: "new-message",
    state: 0,
    service: _a.chat,
    dataset: {
      area: _ui_.mget(_a.area)
    }
  });
  if (_ui_.mget(_a.area) === _a.dmz) {
    chat = '';
    notification = '';
  } else {
    chat.respawn = "window_channel";
    notification.respawn = "window_channel";
  }

  const devices = Skeletons.Box.X({
    sys_pn: "devices-list"
  });

  const controls = _ui_.get('controls') || 'sc';
  const attendees = require('builtins/webrtc/skeleton/attendees')(_ui_);

  const videoPill = Skeletons.Box.X({
    className: `${_ui_.fig.family}__header-video-pill`,
    kids: [
      Skeletons.Image.Svg({ ico: "video", className: `${_ui_.fig.family}__header-video-icon` })
    ]
  });

  const timerPill = Skeletons.Box.X({
    className: `${_ui_.fig.family}__header-timer`,
    sys_pn: "header-timer",
    state: 0,
    kids: [
      Skeletons.Note({ className: "timer-dot" }),
      Skeletons.Note({ className: "timer-value", content: "00:00", sys_pn: "header-timer-value" }),
    ]
  });

  const a = Skeletons.Box.X({
    className: `${_ui_.fig.group}-${figname}__container`,
    sys_pn: _a.topBar,
    service: _e.raise,
    debug: __filename,
    kids: [
      videoPill,
      Skeletons.Box.X({
        className: `${_ui_.fig.family}__${figname}-title`,
        kids: [
          Skeletons.Note({
            sys_pn: "ref-window-name",
            uiHandler: _ui_,
            partHandler: _ui_,
            className: "name",
            content: name
          })
        ]
      }),
      Skeletons.Wrapper.Y({
        className: `${_ui_.fig.family}__wrapper--context dialog__wrapper--context`,
        name: "context",
        uiHandler: _ui_,
        partHandler: _ui_
      }),
      chat,
      notification,
      attendees,
      devices,
      timerPill,
      require('window/skeleton/topbar/control')(_ui_, controls)
    ]
  });

  return a;
};
module.exports = __window_meeting_topbar;
