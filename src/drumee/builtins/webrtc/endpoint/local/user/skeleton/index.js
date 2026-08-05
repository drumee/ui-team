const __skl_stream_local = function (_ui_) {
  const sound = {
    className: `${_ui_.fig.family}__sound-analyzer`,
    kind: "sound_analyzer",
    stream: _ui_.stream,
    sys_pn: "sound",
    uiHandler: [_ui_]
  };

  // Source name fields exactly like broadcastJoining does (`mget || Visitor.*`)
  // so the local tile derives its initials, color, and footer name from the
  // SAME values the remote tiles receive. The local endpoint model is seeded
  // only from Visitor.profile() (participants/index.js), whose lastname can be
  // empty while Visitor.lastname() falls back to a secondary field — without
  // the fallback the owner read "T"/"Test" here vs "TO"/"Test Owner1" remotely.
  const firstname = _ui_.mget(_a.firstname) || Visitor.firstname() || "";
  const lastname = _ui_.mget(_a.lastname) || Visitor.lastname() || "";
  // Footer badge: match the remote footer, which shows the broadcast display
  // name (Visitor.fullname() for a member). Fall back to the split name, then
  // the old username chain, then LOCALE.ME for a nameless guest.
  const uname =
    Visitor.fullname() ||
    `${firstname} ${lastname}`.trim() ||
    _ui_.mget("username") ||
    _ui_.mget("uname") ||
    LOCALE.ME;

  // Feed the profile widget the SAME split firstname/lastname the remote tile
  // uses (endpoint/remote/user/skeleton) so initiales() and colorFromName()
  // produce identical initials + color for the same person on every client.
  const avatar = {
    kind: KIND.profile,
    // `Visitor.profile().id` is not dependably populated — the rest of the app
    // uses `Visitor.id` as the canonical local id — and this is the self-view,
    // so it is unambiguously the local user. Name them explicitly rather than
    // leaning on a fallback further down the pipeline. No avatar_mtime: the
    // profile widget reads Visitor's mtime live for the local user, so changing
    // your own avatar mid-call re-versions this tile immediately.
    id: _ui_.mget('avatar_id') || _ui_.mget(_a.uid) || Visitor.id,
    type: 'thumb',
    active: 0,
    firstname,
    lastname
  };

  const topActions = Skeletons.Box.X({
    className: `${_ui_.fig.family}__tile-top-actions`,
    kids: [
      // Status badges — visibility driven by data-attrs on the tile root
      // (data-presenting, data-raised) which window_meeting flips from
      // _setMemberPresenting / _toggleHandRaise.
      Skeletons.Button.Svg({
        className: `${_ui_.fig.family}__tile-badge ${_ui_.fig.family}__tile-badge--share`,
        ico: "meet-screen",
        tooltips: LOCALE.SHARING_SCREEN || "Sharing screen",
        active: 0,
      }),
      Skeletons.Button.Svg({
        className: `${_ui_.fig.family}__tile-badge ${_ui_.fig.family}__tile-badge--hand`,
        ico: "meet-hand",
        tooltips: LOCALE.HAND_RAISED || "Hand raised",
        active: 0,
      }),
      Skeletons.Button.Svg({
        className: `${_ui_.fig.family}__tile-pin`,
        ico: "meet-pin",
        sys_pn: "tile-pin",
        service: "pin-tile",
        uiHandler: [_ui_],
      }),
      Skeletons.Button.Svg({
        className: `${_ui_.fig.family}__tile-dots`,
        ico: "meet-dots",
      }),
    ]
  });

  const footer = Skeletons.Box.X({
    className: `${_ui_.fig.family}__tile-footer`,
    kids: [
      Skeletons.Button.Svg({
        className: `${_ui_.fig.family}__tile-mic`,
        ico: "meet-mic-slash",
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
