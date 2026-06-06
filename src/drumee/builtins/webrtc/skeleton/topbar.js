module.exports = function (_ui_) {
  const pfx = _ui_.fig.family;
  const name = _ui_.mget(_a.name) || _ui_.mget(_a.filename) || "";

  // This topbar is shared with connect/sharebox/dmz rooms — gate the
  // meeting-only affordances so they don't leak into other room types.
  const isTeamMeeting = _ui_.service_class === "meeting"
    && _ui_.mget(_a.area) !== _a.dmz;

  // People toggle — opens the side panel on the Participants tab (roster of
  // members + Call buttons, or the live tiles while sharing). Team meetings
  // only; handled by _toggleSidePanel in window/meeting/index.js.
  const peopleBtn = isTeamMeeting ? Skeletons.Button.Svg({
    ico: "desktop_group",
    service: "show-people",
    uiHandler: [_ui_],
    className: `${pfx}__in-topbar-people-btn`,
    attrOpt: { title: LOCALE.PARTICIPANTS },
  }) : null;

  const hostLabel = isTeamMeeting ? Skeletons.Note({
    className: `${pfx}__in-topbar-host`,
    sys_pn: "host-label",
    state: 0,
    content: "",
  }) : null;

  // Chat toggle + unread badge — opens the slide-in team chat panel
  // (handled by toggleMeetingChat). Team meetings only.
  const chatBtn = isTeamMeeting ? Skeletons.Box.X({
    className: `${pfx}__in-topbar-chat-wrap`,
    kids: [
      Skeletons.Button.Svg({
        ico: "tchat",
        service: _a.chat,
        uiHandler: [_ui_],
        className: `${pfx}__in-topbar-chat-btn`,
        attrOpt: { title: LOCALE.CHAT },
      }),
      Skeletons.Note({
        className: `${pfx}__in-topbar-chat-badge`,
        sys_pn: "new-message",
        state: 0,
        content: "",
      }),
    ],
  }) : null;

  // Window close (X) — routes to the meeting's close/leave confirmation.
  // Team-meeting only, so connect/dmz topbars keep their original controls.
  const closeBtn = isTeamMeeting ? Skeletons.Button.Svg({
    ico: "cross",
    service: _a.close,
    uiHandler: [_ui_],
    className: `${pfx}__in-topbar-close`,
    attrOpt: { title: LOCALE.CLOSE },
  }) : null;

  // `window__header` makes this bar the window's drag handle (setupInteract
  // binds dragging to `.${fig.group}__header`). Scoped to the team meeting so
  // connect/dmz/sharebox topbars are unchanged from before.
  const headerClass = isTeamMeeting
    ? `${pfx}__in-topbar window__header`
    : `${pfx}__in-topbar`;

  return Skeletons.Box.X({
    className: headerClass,
    kids: [
      Skeletons.Image.Svg({ ico: "folder-meeting", className: `${pfx}__in-topbar-icon` }),
      Skeletons.Note({ className: `${pfx}__in-topbar-title`, content: name, sys_pn: "call-title" }),
      hostLabel,
      Skeletons.Note({ className: `${pfx}__in-topbar-timer`, content: "00:00", sys_pn: "elapsed-timer" }),
      Skeletons.Box.X({ className: `${pfx}__in-topbar-avatars`, sys_pn: "topbar-avatars" }),
      chatBtn,
      peopleBtn,
      closeBtn,
    ].filter(Boolean),
  });
};
