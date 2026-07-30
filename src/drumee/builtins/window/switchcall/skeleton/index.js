// "Meeting Started" / incoming-call popup. Shown when someone starts a meeting
// (dispatchRoom in desk/wm/push.js) or rings during a call (type=connect).
// Keeps the original accept/decline services — only the card layout changed.
const __skl_window_switchcall = function (_ui_) {
  let title, byline;
  const data = _ui_.peerData || {};
  const origin = data.origin || data;
  const pfx = `${_ui_.fig.family}`;
  const name =
    origin.username || origin.firstname || origin.lastname || origin.email || "";

  if (_ui_.mget(_a.type) === _e.connect) {
    title = LOCALE.X_IS_CALLING_YOU.format(name);
    byline = LOCALE.INCOMING_CALL || "";
  } else {
    title = LOCALE.MEETING_STARTED;
    // `details` is mfs_node_attr(room_id) taken against the hub's own db, but a
    // hub node lives in its owner's db — so for a meeting it comes back empty
    // and details.filename is undefined. hub_name carries the workspace name.
    const folder =
      (data.details && data.details.filename) || data.filename || data.hub_name || "";
    // Never render a dangling "started a meeting in " with nothing after it.
    byline = folder
      ? LOCALE.X_STARTED_MEETING_IN.format(name, folder)
      : LOCALE.X_STARTED_A_MEETING.format(name);
  }

  const closeBtn = Skeletons.Button.Svg({
    ico: "meet-x",
    className: `${pfx}__close`,
    service: "decline",
    uiHandler: [_ui_],
  });

  const brandIcon = Skeletons.Box.X({
    className: `${pfx}__brand`,
    kids: [
      Skeletons.Image.Svg({ ico: "meet-camera", className: `${pfx}__brand-icon` }),
    ],
  });

  const titleRow = Skeletons.Box.X({
    className: `${pfx}__title-row`,
    kids: [
      Skeletons.Note({ className: `${pfx}__title`, content: title }),
      Skeletons.Note({ className: `${pfx}__live-dot` }),
    ],
  });

  const bylineRow = Skeletons.Box.X({
    className: `${pfx}__byline-row`,
    kids: [
      Skeletons.UserProfile({
        className: `${pfx}__byline-avatar`,
        id: origin.uid || origin.drumate_id,
        firstname: origin.firstname || name,
        lastname: origin.lastname || "",
        auto_color: 1,
      }),
      Skeletons.Note({ className: `${pfx}__byline`, content: byline }),
    ],
  });

  const body = Skeletons.Box.Y({
    className: `${pfx}__body`,
    debug: __filename,
    kids: [brandIcon, titleRow, bylineRow],
  });

  const footer = Skeletons.Box.X({
    debug: __filename,
    className: `${_ui_.fig.family}__commands ${pfx}__commands `,
    kidsOpt: {
      uiHandlers: [_ui_],
    },
    kids: [
      Skeletons.Note({
        className: `ctrl-button cancel ${pfx}__dismiss-btn`,
        service: "decline",
        content: LOCALE.DISMISS,
      }),
      Skeletons.Note({
        className: `ctrl-button accept ${pfx}__join-btn`,
        name: _a.audio,
        content:
          _ui_.mget(_a.type) === _e.connect
            ? LOCALE.REJOIN
            : LOCALE.JOIN_MEETING,
        state: 1,
        service: "accept",
      }),
    ],
  });

  const a = Skeletons.Box.Y({
    className: `${pfx}__main`,
    debug: __filename,
    kids: [closeBtn, body, footer],
  });

  return a;
};
module.exports = __skl_window_switchcall;
