module.exports = function (_ui_) {
  const pfx = _ui_.fig.family;

  return Skeletons.Box.Y({
    className: `${pfx}__container`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__header`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__title`,
            content: LOCALE.DRUMEE_CALL || "Drumee Call",
          }),
        ],
      }),

      Skeletons.Note({
        className: `${pfx}__section-label`,
        content: LOCALE.FOLDER_MEMBER || "Folder members",
      }),

      Skeletons.List.Smart({
        className: `${pfx}__members-list`,
        sys_pn: "members-list",
        api: {
          service: SERVICE.hub.get_members_by_type,
          type: "all",
          hub_id: _ui_.mget(_a.hub_id),
          timer: 500,
        },
        itemsOpt: { kind: "widget_meeting_member", uiHandler: [_ui_] },
        vendorOpt: Preset.List.Orange_e,
        evArgs: Skeletons.Note(LOCALE.NO_MEMBER || "No members", "no-content"),
      }),

      Skeletons.Box.X({
        className: `${pfx}__footer`,
        kids: [
          Skeletons.Button.Label({
            className: `${pfx}__start-btn`,
            label: LOCALE.START_MEETING || "Start Meeting",
            ico: "folder-meeting",
            service: "start-meeting",
            uiHandler: [_ui_],
          }),
          Skeletons.Button.Label({
            ico: "cross",
            className: `${pfx}__cancel-btn`,
            label: LOCALE.CANCEL,
            service: "cancel",
            uiHandler: [_ui_],
          }),
        ],
      }),
    ],
  });
};
