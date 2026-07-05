// In-call top bar, shared by connect / dmz / sharebox rooms and the team
// meeting window. For a team meeting it carries the full control cluster; each
// control keeps the exact sys_pn / service / name / dataset the floating
// command bar used, so the WebRTC room wiring rebinds unchanged regardless of
// DOM position. Non-meeting rooms keep the original minimal bar.
module.exports = function (_ui_) {
  const pfx = _ui_.fig.family;
  const name = _ui_.mget(_a.name) || _ui_.mget(_a.filename) || "";

  const isTeamMeeting =
    _ui_.service_class === "meeting" && _ui_.mget(_a.area) !== _a.dmz;

  const brand = Skeletons.Box.X({
    className: `${pfx}__in-topbar-brand`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__in-topbar-logo`,
        kids: [
          Skeletons.Image.Svg({
            ico: "video",
            className: `${pfx}__in-topbar-icon`,
          }),
        ],
      }),
      Skeletons.Note({
        className: `${pfx}__in-topbar-title`,
        content: name,
        sys_pn: "call-title",
      }),
    ],
  });

  if (!isTeamMeeting) {
    return Skeletons.Box.X({
      className: `${pfx}__in-topbar`,
      kids: [
        Skeletons.Image.Svg({
          ico: "folder-meeting",
          className: `${pfx}__in-topbar-icon`,
        }),
        Skeletons.Note({
          className: `${pfx}__in-topbar-title`,
          content: name,
          sys_pn: "call-title",
        }),
        Skeletons.Note({
          className: `${pfx}__in-topbar-timer`,
          content: "00:00",
          sys_pn: "elapsed-timer",
        }),
        Skeletons.Box.X({
          className: `${pfx}__in-topbar-avatars`,
          sys_pn: "topbar-avatars",
        }),
      ],
    });
  }

  // Kept (hidden via CSS) so ensurePart("host-label"/"elapsed-timer"/
  // "topbar-avatars") in window/meeting/index.js still resolves.
  const hostLabel = Skeletons.Note({
    className: `${pfx}__in-topbar-host`,
    sys_pn: "host-label",
    state: 0,
    content: "",
  });
  const elapsedTimer = Skeletons.Note({
    className: `${pfx}__in-topbar-timer`,
    content: "00:00",
    sys_pn: "elapsed-timer",
  });
  const avatars = Skeletons.Box.X({
    className: `${pfx}__in-topbar-avatars`,
    sys_pn: "topbar-avatars",
  });

  const handBtn = Skeletons.Button.Svg({
    ico: "meet-hand",
    sys_pn: "ctrl-hand",
    name: "hand-raise",
    service: "hand-raise",
    uiHandler: [_ui_],
    className: `${pfx}__ctrl-btn hand-raise`,
    attrOpt: { title: LOCALE.RAISE_HAND },
    dataset: { raised: 0 },
  });

  const reactionsBtn = Skeletons.Button.Svg({
    ico: "meet-smiley",
    service: "reactions",
    uiHandler: [_ui_],
    className: `${pfx}__ctrl-btn reactions`,
    attrOpt: { title: LOCALE.REACTIONS },
  });

  const chatWrap = Skeletons.Box.X({
    className: `${pfx}__in-topbar-chat-wrap`,
    kids: [
      Skeletons.Button.Svg({
        ico: "meet-chat-dots",
        service: _a.chat,
        uiHandler: [_ui_],
        className: `${pfx}__ctrl-btn chat`,
        attrOpt: { title: LOCALE.CHAT },
      }),
      Skeletons.Note({
        className: `${pfx}__in-topbar-chat-badge`,
        sys_pn: "new-message",
        state: 0,
        content: "",
      }),
    ],
  });

  const peopleBtn = Skeletons.Button.Svg({
    ico: "meet-users",
    service: "show-people",
    uiHandler: [_ui_],
    className: `${pfx}__ctrl-btn people`,
    attrOpt: { title: LOCALE.PARTICIPANTS },
  });

  // Window-resize dropdown: Full screen / Tile left / Tile right / Reframe.
  // KIND.menu.topic gives the trigger open-on-click + click-outside dismissal.
  const resizeItem = (ico, label, service) =>
    Skeletons.Button.Label({
      className: `${pfx}__resize-item`,
      ico,
      label,
      labelClass: `${pfx}__resize-item-label`,
      service,
      uiHandler: [_ui_],
    });

  const fullscreenBtn = {
    kind: KIND.menu.topic,
    className: `${pfx}__resize-menu`,
    flow: _a.y,
    opening: _e.click,
    persistence: _a.once,
    offsetY: 8,
    trigger: Skeletons.Button.Svg({
      ico: "meet-expand",
      className: `${pfx}__ctrl-btn fullscreen`,
      attrOpt: { title: LOCALE.FULL_SCREEN },
    }),
    items: Skeletons.Box.Y({
      className: `${pfx}__resize-items`,
      kids: [
        resizeItem("meet-expand", LOCALE.FULL_SCREEN, "toggle-fullscreen"),
        resizeItem("meet-tile", LOCALE.TILE_WINDOW_LEFT, "tile-window-left"),
        resizeItem("meet-tile", LOCALE.TILE_WINDOW_RIGHT, "tile-window-right"),
        resizeItem("meet-reframe", LOCALE.REFRAME, "reframe-window"),
      ],
    }),
  };

  const divider = Skeletons.Note({ className: `${pfx}__in-topbar-divider` });

  // Camera pill: toggle + decorative caret (video-input switching not wired).
  const cameraPill = Skeletons.Box.X({
    className: `${pfx}__ctrl-pill camera`,
    kids: [
      Skeletons.Button.Svg({
        className: "ctrl-button accept ctrl-video",
        ico: "meet-camera",
        icons: ["meet-camera-slash", "meet-camera"],
        // Default on: icons[undefined] would render a fallback "bars" glyph.
        state: _ui_.mget(_a.video) != null ? _ui_.mget(_a.video) : 1,
        sys_pn: "ctrl-video",
        name: _a.video,
        service: _a.settings,
        dataset: { muted: 1, ctrl: "video" },
      }),
      Skeletons.Image.Svg({
        ico: "meet-caret-down",
        className: `${pfx}__ctrl-caret`,
      }),
    ],
  });

  const micPill = Skeletons.Box.X({
    className: `${pfx}__ctrl-pill mic`,
    kids: [
      Skeletons.Button.Svg({
        className: "ctrl-button accept ctrl-audio",
        ico: "meeting-mic",
        icons: ["meet-mic-slash", "meeting-mic"],
        state: _ui_.mget(_a.audio) != null ? _ui_.mget(_a.audio) : 1,
        sys_pn: "ctrl-audio",
        name: _a.audio,
        service: _a.settings,
        dataset: { muted: 1 },
      }),
      Skeletons.Button.Svg({
        className: "ctrl-button settings audio ctrl-devicesetting",
        ico: "meet-caret-down",
        sys_pn: "ctrl-devicesetting",
        name: _a.devicesettings,
        service: "device-setting",
      }),
      Skeletons.Wrapper.Y({
        className: `${pfx}__devices-list audio`,
        sys_pn: "audio-devices",
        partHandler: [_ui_],
      }),
    ],
  });

  const screenBtn = Skeletons.Button.Svg({
    className: `${pfx}__ctrl-btn screen ctrl-screen`,
    ico: "meet-screen",
    state: 0,
    sys_pn: "ctrl-screen",
    name: _a.screen,
    service: "start-screenshare",
    attrOpt: { title: LOCALE.SHARE_SCREEN },
    dataset: { muted: 1 },
  });

  // ctrl-line contract: close → leave confirmation.
  const leaveBtn = Skeletons.Button.Label({
    className: `${pfx}__leave-btn`,
    ico: "meet-leave",
    label: LOCALE.LEAVE_MEETING,
    labelClass: `${pfx}__leave-label`,
    sys_pn: "ctrl-line",
    service: _e.close,
    uiHandler: [_ui_],
    bubble: 0,
  });

  return Skeletons.Box.X({
    // window__header marks the bar as the window drag handle.
    className: `${pfx}__in-topbar window__header`,
    kids: [
      brand,
      hostLabel,
      elapsedTimer,
      avatars,
      Skeletons.Box.X({
        className: `${pfx}__in-topbar-controls`,
        kids: [
          handBtn,
          reactionsBtn,
          chatWrap,
          peopleBtn,
          fullscreenBtn,
          divider,
          cameraPill,
          micPill,
          screenBtn,
          leaveBtn,
        ],
      }),
    ],
  });
};
