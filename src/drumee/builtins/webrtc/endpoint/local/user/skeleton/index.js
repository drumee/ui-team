const __skl_stream_local = function (_ui_) {
  const sound = {
    className: `${_ui_.fig.family}__sound-analyzer`,
    kind: "sound_analyzer",
    stream: _ui_.stream,
    sys_pn: "sound",
    uiHandler: [_ui_]
  };

  const uname = _ui_.mget('username') || _ui_.mget('uname') || LOCALE.ME;

  const avatar = {
    kind: KIND.profile,
    id: _ui_.mget('avatar_id') || Visitor.profile().id,
    type: 'thumb',
    active: 0,
    firstname: uname
  };

  const topActions = Skeletons.Box.X({
    className: `${_ui_.fig.family}__tile-top-actions`,
    kids: [
      // Status badges — visibility driven by data-attrs on the tile root
      // (data-presenting, data-raised) which window_meeting flips from
      // _setMemberPresenting / _toggleHandRaise.
      Skeletons.Button.Svg({
        className: `${_ui_.fig.family}__tile-badge ${_ui_.fig.family}__tile-badge--share`,
        ico: "presentation",
        tooltips: LOCALE.SHARING_SCREEN || "Sharing screen",
        active: 0,
      }),
      Skeletons.Button.Svg({
        className: `${_ui_.fig.family}__tile-badge ${_ui_.fig.family}__tile-badge--hand`,
        ico: "hand-raise",
        tooltips: LOCALE.HAND_RAISED || "Hand raised",
        active: 0,
      }),
      Skeletons.Button.Svg({
        className: `${_ui_.fig.family}__tile-pin`,
        ico: "drumee-tools_pin",
        sys_pn: "tile-pin",
        service: "pin-tile",
        tooltips: LOCALE.PIN_TILE || "Pin to spotlight",
        uiHandler: [_ui_],
      }),
      Skeletons.Button.Svg({
        className: `${_ui_.fig.family}__tile-dots`,
        ico: "bold-dot-vertical",
      }),
    ]
  });

  const footer = Skeletons.Box.X({
    className: `${_ui_.fig.family}__tile-footer`,
    kids: [
      Skeletons.Button.Svg({
        className: `${_ui_.fig.family}__tile-mic`,
        ico: "micro",
        sys_pn: _a.audio,
        attrOpt: { id: `${_ui_.mget("participant_id")}-local-mic` }
      }),
      Skeletons.Note({
        content: uname,
        className: `${_ui_.fig.family}__uname`,
      }),
      Skeletons.Button.Svg({
        className: `${_ui_.fig.family}__tile-maximize`,
        ico: "player-fullscreen",
        service: "togglefullscreen",
        uiHandler: [_ui_],
      }),
    ]
  });

  const a = Skeletons.Box.Y({
    className: `${_ui_.fig.family}__main`,
    kids: [
      Skeletons.Wrapper.Y({
        className: `${_ui_.fig.family}__avatar`,
        sys_pn: "avatar",
        kids: [avatar],
        attrOpt: { id: "localuseravatar" }
      }),

      Skeletons.Element({
        tagName: _a.video,
        className: `${_ui_.fig.family}__video local`,
        sys_pn: _a.video,
        attrOpt: {
          autoplay: '1',
          playsinline: true,
          id: `${_ui_.mget("participant_id")}-local-video`
        }
      }),

      Skeletons.Element({
        tagName: _a.audio,
        className: `${_ui_.fig.family}__audio local`,
        sys_pn: _a.audio,
        attrOpt: {
          autoplay: '1',
          id: `${_ui_.mget("participant_id")}-local-audio`,
          muted: true
        }
      }),

      Skeletons.Element({
        className: `${_ui_.fig.family}__video__screen local`,
        sys_pn: _a.screen,
        attrOpt: {
          autoplay: true,
          id: "localpresentervideo",
          playsinline: true
        }
      }),

      sound,
      topActions,
      footer,
    ]
  });

  return a;
};
module.exports = __skl_stream_local;
