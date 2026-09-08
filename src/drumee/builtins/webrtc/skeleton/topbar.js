// In-call top bar, shared by connect / dmz / sharebox rooms and the team
// meeting window. For a team meeting it carries the full control cluster; each
// control keeps the exact sys_pn / service / name / dataset the floating
// command bar used, so the WebRTC room wiring rebinds unchanged regardless of
// DOM position. Non-meeting rooms keep the original minimal bar.
module.exports = function (_ui_) {
  const pfx = _ui_.fig.family;
  const name = _ui_.mget(_a.name) || _ui_.mget(_a.filename) || "";

  // The 1:1 connect (P2P) call follows the Figma "Drumee connect" design: its
  // top bar is only the window header (title + expand + close), and every call
  // control lives in the bottom action bar (webrtc/skeleton/p2p-commands.js).
  // Team meetings below are untouched.
  if (_ui_.service_class === "connect") return require("./p2p-header")(_ui_);

  // Carry the full control cluster in the top bar for the team meeting. Other
  // rooms (dmz / sharebox) keep the original minimal bar + floating command bar.
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
    attrOpt: { "data-tip": LOCALE.RAISE_HAND },
    dataset: { raised: 0 },
  });

  // Wrap so a raised-hand count badge can sit on the corner of the button.
  // window_meeting._updateHandRaiseBadge shows the count (via sys_pn
  // "hand-count") once more than one participant has a hand up.
  const handWrap = Skeletons.Box.X({
    className: `${pfx}__ctrl-hand-wrap`,
    kids: [
      handBtn,
      Skeletons.Note({
        className: `${pfx}__ctrl-hand-badge`,
        sys_pn: "hand-count",
        state: 0,
        content: "",
      }),
    ],
  });

  // Quick-reaction glyph: a clickable emoji that broadcasts a floating
  // reaction to every peer (handled by meeting.onUiEvent "react"). The glyph
  // is carried both as the visible content and an `emoji` attr so the handler
  // can read it back regardless of how the DOM trims the text node.
  const reactionEmoji = (glyph) =>
    Skeletons.Note({
      className: `${pfx}__reaction-emoji`,
      content: glyph,
      emoji: glyph,
      service: "react",
      uiHandler: [_ui_],
      // Keep the bar open on click (like "…"): bubble:0 stops the click
      // reaching the menu's onChildBubble → _closeItems, while still
      // dispatching "react". Lets the user fire several reactions in a row.
      bubble: 0,
    });

  // Reactions smiley: a KIND.menu.topic that drops the quick-reaction bar just
  // below the topbar (default downward direction, like the resize menu — the
  // button sits at the top edge so opening upward would clip). persistence:
  // once closes it on selection or click-outside. The six quick emoji match
  // the Figma "reaction-hovering" popover; the trailing "…" opens the full
  // emoji picker (service: reactions-more).
  const reactionsBtn = {
    kind: KIND.menu.topic,
    className: `${pfx}__reactions-menu`,
    flow: _a.y,
    opening: _e.click,
    persistence: _a.once,
    offsetY: 8,
    trigger: Skeletons.Button.Svg({
      ico: "meet-smiley",
      className: `${pfx}__ctrl-btn reactions`,
      attrOpt: { "data-tip": LOCALE.REACTIONS },
    }),
    items: Skeletons.Box.X({
      className: `${pfx}__reactions-bar`,
      kids: [
        reactionEmoji("👋"),
        reactionEmoji("👍"),
        reactionEmoji("😂"),
        reactionEmoji("😮"),
        reactionEmoji("❤️"),
        reactionEmoji("🎉"),
        Skeletons.Note({
          className: `${pfx}__reactions-more`,
          content: "⋯",
          service: "reactions-more",
          uiHandler: [_ui_],
          // Keep the bar open when "…" is clicked: bubble:0 stops the click
          // reaching the menu's onChildBubble → _closeItems (which
          // persistence:once would otherwise run), while still dispatching
          // "reactions-more" to the meeting. Emoji glyphs keep bubbling, so
          // picking a reaction still closes the bar.
          bubble: 0,
          attrOpt: { title: LOCALE.MORE || "More" },
        }),
      ],
    }),
  };

  const chatWrap = Skeletons.Box.X({
    className: `${pfx}__in-topbar-chat-wrap`,
    kids: [
      Skeletons.Button.Svg({
        ico: "meet-chat-dots",
        service: _a.chat,
        uiHandler: [_ui_],
        className: `${pfx}__ctrl-btn chat`,
        attrOpt: { "data-tip": LOCALE.CHAT },
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
    attrOpt: { "data-tip": LOCALE.PARTICIPANTS },
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
      attrOpt: { "data-tip": LOCALE.FULL_SCREEN },
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

  // Overflow menu for the controls the narrow layout drops. Chat and
  // Participants are hidden from the bar below the data-narrow breakpoint (see
  // meeting-shell.scss) and reachable here instead; this trigger is itself
  // hidden until then, so the wide bar is unchanged. Items dispatch the SAME
  // services as the real buttons (_a.chat / show-people), so the room wiring in
  // window/meeting/index.js needs no new cases.
  const moreItem = (ico, label, service) =>
    Skeletons.Button.Label({
      className: `${pfx}__more-item`,
      ico,
      label,
      labelClass: `${pfx}__more-item-label`,
      service,
      uiHandler: [_ui_],
    });

  const moreBtn = {
    kind: KIND.menu.topic,
    className: `${pfx}__more-menu`,
    flow: _a.y,
    opening: _e.click,
    persistence: _a.once,
    offsetY: 8,
    trigger: Skeletons.Button.Svg({
      ico: "more",
      className: `${pfx}__ctrl-btn more`,
      attrOpt: { "data-tip": LOCALE.MORE || "More" },
    }),
    items: Skeletons.Box.Y({
      className: `${pfx}__more-items`,
      kids: [
        moreItem("meet-chat-dots", LOCALE.CHAT, _a.chat),
        moreItem("meet-users", LOCALE.PARTICIPANTS, "show-people"),
      ],
    }),
  };

  const divider = Skeletons.Note({ className: `${pfx}__in-topbar-divider` });

  // Camera pill: toggle + device caret + video-input picker (twin of the mic
  // pill below). The caret opens the camera list (camera-setting), which is fed
  // into the "video-devices" wrapper by updateVideoDevicesList.
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
      Skeletons.Button.Svg({
        className: "ctrl-button settings video ctrl-devicesetting",
        ico: "meet-caret-down",
        sys_pn: "ctrl-camerasetting",
        name: _a.devicesettings,
        service: "camera-setting",
      }),
      Skeletons.Wrapper.Y({
        className: `${pfx}__devices-list video`,
        sys_pn: "video-devices",
        partHandler: [_ui_],
      }),
      // Backgrounds & effects panel, docked to the left of the device list;
      // fed by updateBgEffectsPanel when "Upload Background" is clicked.
      Skeletons.Wrapper.Y({
        className: `${pfx}__bg-effects`,
        sys_pn: "bg-effects",
        partHandler: [_ui_],
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
    attrOpt: { "data-tip": LOCALE.SHARE_SCREEN },
    dataset: { muted: 1 },
  });

  // Leaving is a HOST decision with two outcomes, so the host gets a Teams-style
  // split button: the main half always just leaves (the room stays live for
  // everyone else) and the caret opens the two explicit choices. Ending the
  // meeting for all is therefore never something a single click can do by
  // accident — see window/meeting/index.js `_endForAll`.
  // A guest has only one outcome, so it keeps the plain pill and the legacy
  // `close` → leave-confirmation path.
  const isHost = !!_ui_._isHost;

  // ctrl-line contract: close → leave confirmation (guest) / leave-only (host).
  const leaveBtn = Skeletons.Button.Label({
    className: `${pfx}__leave-btn`,
    ico: "meet-leave",
    label: isHost ? LOCALE.LEAVE : LOCALE.LEAVE_MEETING,
    labelClass: `${pfx}__leave-label`,
    sys_pn: "ctrl-line",
    service: isHost ? "leave-meeting" : _e.close,
    uiHandler: [_ui_],
    bubble: 0,
  });

  // Two-line menu row: the labels alone don't say who is affected, so each
  // carries the consequence underneath it.
  // The ROW carries the service, so every descendant has to be inert —
  // `active: 0`, which is what stops letc.js binding a click handler on it at
  // all. A descendant left active does bind one, and __handleClick
  // unconditionally stopPropagation()s: the row then never fires and only the
  // gaps between the children are clickable. `kidsOpt` reaches DIRECT kids
  // only, so the nested text box has to pass it on to its own Notes.
  const inert = { active: 0 };
  const leaveMenuItem = (ico, label, hint, service, cls) =>
    Skeletons.Box.X({
      className: `${pfx}__leave-item${cls ? ` ${cls}` : ""}`,
      service,
      uiHandler: [_ui_],
      kidsOpt: inert,
      kids: [
        Skeletons.Image.Svg({
          ico,
          className: `${pfx}__leave-item-ico`,
          ...inert,
        }),
        Skeletons.Box.Y({
          className: `${pfx}__leave-item-text`,
          ...inert,
          kidsOpt: inert,
          kids: [
            Skeletons.Note({
              className: `${pfx}__leave-item-label`,
              content: label,
              ...inert,
            }),
            Skeletons.Note({
              className: `${pfx}__leave-item-hint`,
              content: hint,
              ...inert,
            }),
          ],
        }),
      ],
    });

  const leaveMenu = {
    kind: KIND.menu.topic,
    className: `${pfx}__leave-menu`,
    flow: _a.y,
    opening: _e.click,
    persistence: _a.once,
    offsetY: 8,
    trigger: Skeletons.Button.Svg({
      ico: "meet-caret-down",
      className: `${pfx}__leave-caret`,
      attrOpt: { "data-tip": LOCALE.MORE_OPTIONS },
    }),
    items: Skeletons.Box.Y({
      className: `${pfx}__leave-items`,
      kids: [
        leaveMenuItem(
          "meet-leave",
          LOCALE.LEAVE_MEETING,
          LOCALE.LEAVE_MEETING_HINT,
          "leave-meeting",
        ),
        leaveMenuItem(
          "app-call-end",
          LOCALE.END_MEETING,
          LOCALE.END_MEETING_HINT,
          "end-meeting",
          "danger",
        ),
      ],
    }),
  };

  const leaveControl = isHost
    ? Skeletons.Box.X({
        className: `${pfx}__leave-split`,
        kids: [leaveBtn, leaveMenu],
      })
    : leaveBtn;

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
          handWrap,
          reactionsBtn,
          chatWrap,
          peopleBtn,
          // Stands in for chat + people once those are hidden (data-narrow).
          moreBtn,
          fullscreenBtn,
          divider,
          cameraPill,
          micPill,
          screenBtn,
          leaveControl,
        ],
      }),
    ],
  });
};
