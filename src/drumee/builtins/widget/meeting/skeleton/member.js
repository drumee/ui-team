module.exports = function (_ui_) {
  const pfx = _ui_.fig.family;
  const firstname = _ui_.mget(_a.firstname) || "";
  const lastname = _ui_.mget(_a.lastname) || "";
  const fullname = _ui_.mget(_a.fullname) || `${firstname} ${lastname}`.trim();

  return Skeletons.Box.X({
    className: `${pfx}__member-row`,
    kids: [
      Skeletons.UserProfile({
        className: `${pfx}__member-avatar`,
        id: _ui_.mget(_a.drumate_id) || _ui_.mget(_a.entity_id),
        firstname,
        lastname,
        live_status: 1,
        auto_color: 1,
      }),

      Skeletons.Box.Y({
        className: `${pfx}__member-info`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__member-name`,
            content: fullname,
          }),
          Skeletons.Note({
            className: `${pfx}__member-email`,
            content: _ui_.mget(_a.email) || "",
          }),
        ],
      }),

      Skeletons.Button.Label({
        className: `${pfx}__member-call-btn`,
        ico: "folder-meeting",
        label: LOCALE.CALL || "Call",
        service: "call-member",
        uiHandler: [_ui_],
      }),
    ],
  });
};
