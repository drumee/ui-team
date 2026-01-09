
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

  // Resolve permission label based on privilege value (similar to permission/index.js)
  const resolveLabel = (p) => {
    if (!p) return LOCALE.PERMISSION_READ || "Download only";

    // Check owner first
    if (ui.isMediaOwner()) {
      return LOCALE.OWNER;
    }

    // Check admin
    if (ui.canAdmin()) {
      return "All permissions" || LOCALE.ADMINISTRATOR || "Administrator";
    }

    // Check delete/modify (all permissions)
    if (ui.canOrganize()) {
      return LOCALE.PERMISSION_DELETE_ORGANIZE || LOCALE.ALL_PERMISSIONS || "All permissions";
    }

    // Check write/upload (upload and download)
    if (ui.canUpload()) {
      return LOCALE.PERMISSION_UPLOAD_DOWNLOAD || LOCALE.UPLOAD_ONLY || "Upload only";
    }

    // Check read/view (download only)
    if (ui.canDownload()) {
      return LOCALE.PERMISSION_READ || LOCALE.DOWNLOAD_ONLY || "Download only";
    }

    // Default fallback
    return LOCALE.PERMISSION_READ || LOCALE.DOWNLOAD_ONLY || "Download only";
  };

  const permissionLabel = resolveLabel(privilege);

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

  const isOwner = privilege && (parseInt(privilege) === _K.privilege.owner || parseInt(privilege) === _K.permission.owner);

  // Permission options using privilege values (not permission flags)
  const permissionOptions = [
    {
      label: LOCALE.PERMISSION_DELETE_ORGANIZE || LOCALE.ALL_PERMISSIONS || "All permissions",
      value: "all",
      privilege: _K.privilege.delete // Use privilege value, not permission flag
    },
    {
      label: LOCALE.PERMISSION_UPLOAD_DOWNLOAD || LOCALE.UPLOAD_ONLY || "Upload only",
      value: "upload",
      privilege: _K.privilege.write // Use privilege value, not permission flag
    },
    {
      label: LOCALE.PERMISSION_READ || LOCALE.DOWNLOAD_ONLY || "Download only",
      value: "download",
      privilege: _K.privilege.read // Use privilege value, not permission flag
    },
  ];

  const menuTrigger = Skeletons.Box.X({
    className: `${prefix}__permission-trigger`,
    service: "prompt-permission",
    kidsOpt: {
      active: 0,
    },
    kids: [
      Skeletons.Note({
        content: permissionLabel,
        className: `${prefix}__permission-label`,
      }),
      !isOwner ? Skeletons.Button.Svg({
        ico: "arrow--pages",
        className: `${prefix}__arrow-down`,
      }) : undefined,
    ],
  });

  // const menuItems = !isOwner ? Skeletons.Box.Y({
  //   className: `${prefix}__permission-menu-items`,
  //   kids: permissionOptions.map((opt) => {
  //     // Check if current privilege matches the option privilege value
  //     const currentPrivilege = parseInt(privilege) || 0;
  //     const isActive = currentPrivilege === opt.privilege;
  //     const memberId = ui.mget(_a.entity) || ui.mget(_a.id);

  //     // Wrap Button.Label in a Box with service and dataset to ensure event is triggered correctly
  //     return Skeletons.Box.X({
  //       className: `${prefix}__permission-menu-item-wrapper${isActive ? " active" : ""}`,
  //       service: "change-permission",
  //       name: "change-permission",
  //       uiHandler: [ui],
  //       privilege: opt.privilege,
  //       memberId: memberId,
  //       dataset: {
  //         privilege: opt.privilege,
  //         memberId: memberId,
  //       },
  //       kids: [
  //         Skeletons.Button.Label({
  //           className: `${prefix}__permission-menu-item${isActive ? " active" : ""}`,
  //           label: opt.label,
  //           ico: null,
  //           active: isActive ? 1 : 0,
  //         })
  //       ],
  //     });
  //   }),
  // }) : undefined;
  // const permission = !isOwner ? Skeletons.Box.X({
  //   className: `${prefix}__permission`,
  //   kids: [{
  //     kind: KIND.menu.topic,
  //     className: `${prefix}__permission-dropdown`,
  //     flow: _a.y,
  //     opening: _e.click,
  //     sys_pn: `permission-dropdown-${ui.mget(_a.entity) || ui.mget(_a.id)}`,
  //     service: "permission-menu",
  //     persistence: _a.once,
  //     trigger: menuTrigger,
  //     items: menuItems,
  //     offsetY: 8,
  //   }],
  // }) : Skeletons.Box.X({
  //   className: `${prefix}__permission`,
  //   kids: [menuTrigger],
  // });

  return Skeletons.Box.X({
    className: `${prefix}__item ${type || ""}`,
    debug: __filename,
    uiHandler: ui,
    kids: [profile_icon, info, menuTrigger],
  });
};
