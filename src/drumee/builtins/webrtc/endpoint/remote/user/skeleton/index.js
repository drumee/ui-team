const __skl_stream_remote = function (_ui_) {
  const sound = {
    className: `${_ui_.fig.family}__sound-analyzer`,
    kind: "sound_analyzer",
    sys_pn: "sound",
    uiHandler: [_ui_]
  };
  const uname = _ui_.mget(_a.username);
  const id = _ui_.mget("participant_id");
  let nameState = 1;
  if (_.isEmpty(uname)) {
    nameState = 0;
  }

  // The profile widget derives BOTH the initials and the fallback colour from
  // firstname/lastname. Feeding the whole display name in as `firstname` (the
  // only thing a Jitsi participant carries) made initiales() fall back to
  // "<first letter twice>" — "John Doe" rendered "JJ" in a purple circle in the
  // tile while the People panel and the chat, which get the real name parts,
  // rendered "JD" in a different colour for the same person. Split the display
  // name so every surface agrees. Mirrors endpoint/local/user/skeleton.
  const [unameFirst, ...unameRest] = String(uname || '').trim().split(/[\s,]+/);
  const firstname = _ui_.mget(_a.firstname) || unameFirst || '';
  const lastname = _ui_.mget(_a.lastname) || unameRest.join(' ') || '';

  const avatar = {
    kind: KIND.profile,
    id: _ui_.mget(_a.uid),
    type: 'thumb',
    active: 0,
    className: 'no-online-status',
    firstname,
    lastname,
    // Version the avatar URL by ITS OWNER's mtime, not the viewer's. Without
    // this, a peer who changes their avatar produces a byte-identical URL on
    // every other client, which then serves the pre-change image from the HTTP
    // cache no matter how often the tile re-renders.
    avatar_mtime: _ui_.mget("avatar_mtime"),
    // This tile always belongs to a specific PEER, so the profile widget must
    // never fall back to the local user when `uid` is still unknown — that is
    // what made a joining peer's tile flash the viewer's own avatar. `uid` is
    // undefined only between USER_JOINED and the userAttributes property
    // arriving (see _participantAttributes / onPropertyChanged); until then the
    // tile shows initials, and the property event re-feeds this skeleton.
    strict: 1,
  };

  const topActions = Skeletons.Box.X({
    className: `${_ui_.fig.family}__tile-top-actions`,
    kids: [
      Skeletons.Button.Svg({
        className: `${_ui_.fig.family}__tile-badge ${_ui_.fig.family}__tile-badge--share`,
        ico: "presentation",
        tooltips: LOCALE.SHARING_SCREEN || "Sharing screen",
        active: 0,
      }),
      Skeletons.Button.Svg({
        className: `${_ui_.fig.family}__tile-pin`,
        ico: "meet-pin",
        sys_pn: "tile-pin",
        service: "pin-tile",
        uiHandler: [_ui_],
      }),
    ]
  });

  const footer = Skeletons.Box.X({
    className: `${_ui_.fig.family}__tile-footer`,
    kids: [
      Skeletons.Button.Svg({
        className: `${_ui_.fig.family}__tile-mic`,
        ico: "meet-mic-slash",
        sys_pn: "audio",
        state: _ui_.mget(_a.audio) || _ui_.mget('muted'),
        attrOpt: { id: `${id}_mic` }
      }),
      Skeletons.Note({
        sys_pn: 'uname',
        content: uname,
        className: `${_ui_.fig.family}__uname`,
        dataset: { state: nameState }
      }),
      Skeletons.Button.Svg({
        className: `${_ui_.fig.family}__tile-dots`,
        ico: "meet-dots",
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
        state: _ui_.mget(_a.video),
        attrOpt: { id: `${id}_avatar` }
      }),

      Skeletons.Element({
        tagName: _a.video,
        className: `${_ui_.fig.family}__video remote`,
        sys_pn: _a.video,
        active: 1,
        dataset: { presenter: _ui_.mget("isPresenter") },
        attrOpt: {
          autoplay: "true",
          id: `${id}-remote-video`,
          playsinline: "true"
        }
      }),

      Skeletons.Element({
        tagName: _a.audio,
        className: `${_ui_.fig.family}__audio remote`,
        sys_pn: 'output',
        active: 0,
        attrOpt: {
          autoplay: "true",
          id: `${id}-remote-audio`,
          playsinline: "true"
        }
      }),

      Skeletons.Note({
        sys_pn: _a.error,
        content: '',
        className: `${_ui_.fig.family}__error remote`,
        dataset: { error: 0 }
      }),

      Skeletons.Button.Svg({
        className: `${_ui_.fig.family}__hand-raise-badge`,
        ico: "meet-hand",
      }),

      topActions,
      sound,
      footer,
    ]
  });
  return a;
};
module.exports = __skl_stream_remote;
