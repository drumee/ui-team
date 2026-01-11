
module.exports = function (ui) {
  const prefix = ui.fig.family;
  const fname = ui.mget(_a.firstname) || "";
  const lname = ui.mget(_a.lastname) || "";
  const fullname = ui.mget(_a.fullname) || `${fname} ${lname}`;
  const displayName = ui.mget(_a.surname) || ui.mget("display");
  const type = ui.mget(_a.type);
  const email = ui.email || ui.tooltips || ui.mget(_a.email) || "";

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

    ui.debug("AAAA:123", ui.isMediaOwner(), ui.canAdmin(), ui.canUpload(), ui.canDownload())

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

    return LOCALE.PERMISSION_READ || "Download only";
  };


  const info = Skeletons.Box.Y({
    className: `${prefix}__info`,
    kidsOpt: {
      active: 0,
    },
    kids: [
      Skeletons.Note({
        content: ui.name,
        className: `${prefix}__name ${type || ""}`,
      }),
      Skeletons.Note({
        content: email,
        className: `${prefix}__email`,
      }),
    ],
  });



  let arrow = Skeletons.Button.Svg({
    ico: "arrow--pages",
    className: `${prefix}__arrow-pages`,
    active: 0,
  });

  let active = 1;
  // ui.debug("AAA:89", ui.getHandlers(_a.ui)[0].mget('visitor'))
  if (ui.isMediaOwner() || !(ui.my_privilege & _K.permission.admin)) {
    arrow = "";
    active = 0;
  }

  const configure = Skeletons.Box.X({
    className: `${prefix}__permission-trigger`,
    service: "prompt-permission",
    active,
    kids: [
      Skeletons.Note({
        content: resolveLabel(),
        className: `${prefix}__permission-label`,
        active: 0,
      }),
      arrow
    ],
  });


  return Skeletons.Box.X({
    className: `${prefix}__item ${type || ""}`,
    debug: __filename,
    uiHandler: ui,
    kids: [profile_icon, info, configure],
  });
};
