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
    ui.debug("AAA:26", opt);
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
  // Resolve current role from privilege bitmask
  const resolveRoleValue = () => {
    if (ui.isMediaOwner() || ui.canAdmin()) return 'admin';
    if (ui.canOrganize() || ui.canUpload()) return 'edit';
    if (ui.canDownload()) return 'view';
    return 'chat';
  };

  const roleItems = [
    { value: 'admin', label: 'Admin' },
    { value: 'view', label: LOCALE.VIEW || 'View' },
    { value: 'edit', label: LOCALE.EDIT || 'Edit' },
    { value: 'chat', label: LOCALE.CHAT || 'Chat' },
  ];

  const currentRole = resolveRoleValue();
  const currentRoleItem = roleItems.find(r => r.value === currentRole) || roleItems[0];

  // const roleTrigger = Skeletons.Box.X({
  //   className: `${prefix}__role-trigger`,
  //   kids: [
  //     Skeletons.Note({
  //       content: currentRoleItem.label,
  //       className: `${prefix}__role-label`,
  //     }),
  //     Skeletons.Button.Svg({
  //       ico: 'carret-down',
  //       className: `${prefix}__role-chevron`,
  //     }),
  //   ],
  // });

  // const roleMenuItems = Skeletons.Box.Y({
  //   className: `${prefix}__role-menu`,
  //   kids: roleItems.map(role => Skeletons.Box.X({
  //     className: `${prefix}__role-option`,
  //     service: 'change-role',
  //     name: role.value,
  //     uiHandler: [ui],
  //     kids: [
  //       Skeletons.Note({
  //         content: role.label,
  //         className: `${prefix}__role-option-label`,
  //       }),
  //       Skeletons.Note({
  //         className: `${prefix}__role-option-radio${role.value === currentRole ? ' active' : ''}`,
  //       }),
  //     ],
  //   })),
  // });



  const status = Skeletons.Box.X({
    className: `${prefix}__role-trigger`,
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
  const deleteBtn = canEdit ? Skeletons.Button.Svg({
    ico: 'trash',
    className: `${prefix}__delete-btn`,
    service: 'remove-member',
    uiHandler: [ui],
  }) : null;

  let r = Skeletons.Box.X({
    className: `${prefix}__item ${type || ""}`,
    debug: __filename,
    uiHandler: ui,
    kids: [profile_icon, info, status, deleteBtn],
  });
  ui.debug("AAA:123", ui, r);
  return r;
};
