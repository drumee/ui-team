module.exports = function dashboard(_ui_) {
  const pfx = `${_ui_.fig.family}__dashboard`;
  const api = (typeof _ui_.membersListApi === "function")
    ? _ui_.membersListApi()
    : null;

  return Skeletons.Box.Y({
    className: pfx,
    debug: __filename,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}-header`,
        kids: [
          Skeletons.Note({
            className: `${pfx}-title`,
            content: LOCALE.FOLDER_MEMBER || "Folder members",
          }),
          Skeletons.Button.Svg({
            ico: "cross",
            className: `${pfx}-close`,
            service: "toggle-dashboard",
            uiHandler: _ui_,
          }),
        ],
      }),
      api
        ? Skeletons.List.Smart({
            className: `${pfx}-list`,
            sys_pn: "dashboard-members-list",
            api,
            itemsOpt: {
              kind: "widget_meeting_member",
              uiHandler: [_ui_],
              _meetingUi: _ui_,
            },
            vendorOpt: Preset.List.Orange_e,
            evArgs: Skeletons.Note(
              LOCALE.NO_MEMBER || "No members",
              "no-content"
            ),
          })
        : Skeletons.Note({
            className: `${pfx}-empty`,
            content: LOCALE.NO_MEMBER || "No members",
          }),
    ].filter(Boolean),
  });
};
