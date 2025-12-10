
module.exports = function (ui) {
  const prefix = ui.fig.family;
  const fname = ui.mget(_a.firstname) || "";
  const lname = ui.mget(_a.lastname) || "";
  const fullname = ui.mget(_a.fullname) || `${fname} ${lname}`;
  const displayName = ui.mget(_a.surname) || ui.mget("display");
  const type = ui.mget(_a.type);
  const email = ui.email || ui.tooltips || ui.mget(_a.email) || "";
  const privilege = parseInt(ui.mget(_a.privilege)) || ui.mget(_a.permission);

  let profile_icon;
  if (ui.mget("is_drumate")) {
    profile_icon = Skeletons.UserProfile({
      className: `${prefix}__avatar`,
      id: ui.mget(_a.entity) || ui.mget(_a.id) || ui.mget("drumate_id"),
      firstname: fname || displayName,
      lastname: lname,
      fullname,
      online: ui.mget(_a.online),
      live_status: 1,
    });
  } else {
    profile_icon = Skeletons.Button.Svg({
      ico: "desktop_contactbook",
      className: `${prefix}__avatar profile-icon desktop_contactbook`,
    });
  }

  const permissionLabel = (() => {
    if (privilege && (_K.permission.owner & privilege)) return LOCALE.OWNER;
    if (privilege && (_K.permission.modify & privilege)) return LOCALE.ALL_PERMISSIONS || "All permissions";
    if (privilege && (_K.permission.upload & privilege)) return LOCALE.UPLOAD_ONLY || "Upload only";
    if (privilege && (_K.permission.read & privilege)) return LOCALE.DOWNLOAD_ONLY || "Download only";
    return LOCALE.ALL_PERMISSIONS || "All permissions";
  })();

  const info = Skeletons.Box.Y({
    className: `${prefix}__info`,
    kids: [
      Skeletons.Note({
        content: ui.name,
        className: `${prefix}__name ${type || ""}`,
        active: 0,
      }),
      Skeletons.Note({
        content: email,
        className: `${prefix}__email`,
        active: 0,
      }),
    ],
  });

  const isOwner = privilege && (_K.permission.owner & privilege);
  
  const permissionOptions = [
    { label: LOCALE.ALL_PERMISSIONS || "All permissions", value: "all", privilege: _K.permission.modify },
    { label: LOCALE.UPLOAD_ONLY || "Upload only", value: "upload", privilege: _K.permission.upload },
    { label: LOCALE.DOWNLOAD_ONLY || "Download only", value: "download", privilege: _K.permission.read },
  ];

  const menuTrigger = Skeletons.Box.X({
    className: `${prefix}__permission-trigger`,
    kids: [
      Skeletons.Note({
        content: permissionLabel,
        className: `${prefix}__permission-label`,
      }),
      !isOwner ? Skeletons.Button.Svg({
        ico: "carret-down",
        className: `${prefix}__permission-chevron`,
      }) : undefined,
    ],
  });

  const menuItems = !isOwner ? Skeletons.Box.Y({
    className: `${prefix}__permission-menu-items`,
    kids: permissionOptions.map((opt) =>
      Skeletons.Button.Label({
        className: `${prefix}__permission-menu-item`,
        label: opt.label,
        service: "change-permission",
        uiHandler: [ui],
        privilege: opt.privilege,
        memberId: ui.mget(_a.entity) || ui.mget(_a.id),
      })
    ),
  }) : undefined;

  const permission = !isOwner ? Skeletons.Box.X({
    className: `${prefix}__permission`,
    kids: [{
      kind: KIND.menu.topic,
      className: `${prefix}__permission-dropdown`,
      flow: _a.y,
      opening: _e.click,
      sys_pn: `permission-dropdown-${ui.mget(_a.entity) || ui.mget(_a.id)}`,
      service: "permission-menu",
      persistence: _a.once,
      trigger: menuTrigger,
      items: menuItems,
      offsetY: 8,
    }],
  }) : Skeletons.Box.X({
    className: `${prefix}__permission`,
    kids: [menuTrigger],
  });

  return Skeletons.Box.X({
    className: `${prefix}__item ${type || ""}`,
    debug: __filename,
    uiHandler: ui,
    kids: [profile_icon, info, permission],
  });
};
