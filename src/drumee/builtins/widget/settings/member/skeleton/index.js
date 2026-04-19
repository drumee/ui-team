const { resolveRole } = require("../../../../skeleton/toolkit/permission");
module.exports = function (ui) {
  const prefix = ui.fig.family;
  let fname = ui.mget(_a.firstname) || "";
  let lname = ui.mget(_a.lastname) || "";
  let fullname = ui.mget(_a.fullname) || `${fname} ${lname}`;
  const displayName = ui.mget(_a.surname) || ui.mget("display");
  const type = ui.mget(_a.type);
  const email = ui.email || ui.tooltips || ui.mget(_a.email) || "";
  let surname = "";
  if (ui.mget(_a.id) == Visitor.id) {
    fname = "Me";
    lname = "Myself";
    fullname = "Me";
    surname = "Me";
  } else {
    surname = `${fname} ${lname}`.trim();
  }
  let profile_icon;
  if (ui.mget("is_drumate")) {
    let opt = {
      className: `${prefix}__avatar`,
      id: ui.mget(_a.entity) || ui.mget(_a.id) || ui.mget("drumate_id"),
      firstname: fname || displayName,
      lastname: lname,
      fullname,
      online: ui.mget(_a.online),
      live_status: 1,
      surname,
    };
    profile_icon = Skeletons.UserProfile(opt);
  } else {
    profile_icon = Skeletons.Button.Svg({
      ico: "desktop_contactbook",
      className: `${prefix}__avatar profile-icon desktop_contactbook`,
    });
  }

  const info = Skeletons.Box.Y({
    className: `${prefix}__info`,
    kidsOpt: {
      active: 0,
    },
    kids: [
      Skeletons.Note({
        content: surname,
        className: `${prefix}__name ${type || ""}`,
      }),
      Skeletons.Note({
        content: email,
        className: `${prefix}__email`,
      }),
    ],
  });

  // Determine if current viewer can edit roles
  let canEdit = 0;
  if (ui.getHandlers(_a.ui)[0].mget(_a.privilege) & _K.privilege.admin) {
    canEdit = 1;
    if (ui.isMediaOwner()) {
      canEdit = 0;
    }
  }

  const currentRoleItem = resolveRole(ui);
  const status = Skeletons.Box.X({
    className: `${prefix}__role-trigger`,
    service: "prompt-permission",
    uiHandler: [ui],
    kidsOpt: {
      active: 0,
    },
    kids: [
      Skeletons.Note({
        content: currentRoleItem.label,
        className: `${prefix}__role-label`,
      }),
    ],
  });
  const deleteBtn = canEdit
    ? Skeletons.Button.Svg({
        ico: "trash",
        className: `${prefix}__delete-btn`,
        service: "remove-member",
        uiHandler: [ui],
      })
    : null;

  return Skeletons.Box.X({
    className: `${prefix}__item ${type || ""}`,
    debug: __filename,
    uiHandler: ui,
    kids: [profile_icon, info, status, deleteBtn],
  });
};
