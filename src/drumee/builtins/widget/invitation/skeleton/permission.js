const { topbar } = require("../../settings/hub/skeleton/toolkit")
export default function (ui, member, service) {
  const permissionFig = `${ui.fig.family}-permission`;
  // const { guest, read, write, modify } = _K.permission
  return Skeletons.Box.Y({
    className: `${permissionFig}__main`,
    sys_pn: 'permissions-content',
    kids: [
      topbar(ui, "Permission settings"),
      Skeletons.Box.Y({
        className: `${permissionFig}__content`,
        kids: [
          Skeletons.Box.X({
            className: `${permissionFig}__member`,
            kids: [
              Skeletons.Note({
                className: `${permissionFig}__title`,
                content: "Permission granted to {0}".format(member.mget(_a.fullname)),
              }),
              Skeletons.UserProfile({
                className: `${permissionFig}__avatar`,
                id: member.mget(_a.id),
                live_status: 1,
              })
            ]
          }),
          {
            kind: "settings_permission",
            className: `${permissionFig}__form`,
            ...member.data(),
            sys_pn: "permission-form",
            uiHandler: [ui]
          }
        ]
      }),
      Skeletons.Box.X({
        className: `${permissionFig}__buttons`,
        sys_pn: "buttons",
        kids: [
          Skeletons.Note({
            sys_pn: "update-permission",
            service,
            className: `${permissionFig}-button permission-action`,
            content: LOCALE.SAVE
          }),
        ]
      })
    ]
  });
}
