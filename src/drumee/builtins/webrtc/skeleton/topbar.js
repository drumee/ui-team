module.exports = function (_ui_) {
  const pfx = _ui_.fig.family;
  const name = _ui_.mget(_a.name) || _ui_.mget(_a.filename) || "";

  // This topbar is shared with connect/sharebox/dmz rooms — gate the
  // meeting-only affordances so they don't leak into other room types.
  const isTeamMeeting = _ui_.service_class === "meeting"
    && _ui_.mget(_a.area) !== _a.dmz;

  const dashboardBtn = isTeamMeeting ? Skeletons.Box.X({
    className: `${pfx}__in-topbar-dashboard-wrap`,
    kids: [
      Skeletons.Button.Svg({
        ico: "bold-dot-vertical",
        service: "toggle-dashboard",
        uiHandler: [_ui_],
        className: `${pfx}__in-topbar-dashboard-btn`,
      }),
      Skeletons.Wrapper.Y({
        className: `${pfx}__in-topbar-dashboard-panel`,
        name: "dashboard",
        uiHandler: [_ui_],
        partHandler: _ui_,
      }),
    ],
  }) : null;

  const hostLabel = isTeamMeeting ? Skeletons.Note({
    className: `${pfx}__in-topbar-host`,
    sys_pn: "host-label",
    state: 0,
    content: "",
  }) : null;

  return Skeletons.Box.X({
    className: `${pfx}__in-topbar`,
    kids: [
      Skeletons.Image.Svg({ ico: "folder-meeting", className: `${pfx}__in-topbar-icon` }),
      Skeletons.Note({ className: `${pfx}__in-topbar-title`, content: name, sys_pn: "call-title" }),
      hostLabel,
      Skeletons.Note({ className: `${pfx}__in-topbar-timer`, content: "00:00", sys_pn: "elapsed-timer" }),
      Skeletons.Box.X({ className: `${pfx}__in-topbar-avatars`, sys_pn: "topbar-avatars" }),
      dashboardBtn,
    ].filter(Boolean),
  });
};
