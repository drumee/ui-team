module.exports = function (ui) {
  const pfx      = ui.fig.family;
  const fname    = ui.mget(_a.firstname) || '';
  const lname    = ui.mget(_a.lastname)  || '';
  const fullname = ui.mget(_a.fullname)  || `${fname} ${lname}`.trim();
  const email    = ui.mget('email')      || '';
  const uid      = ui.mget('drumate_id') || ui.mget(_a.id);
  const role     = ui.mget('role')       || '';
  const usagePct = ui.mget('usage_pct')  || 0;
  const storageGb= ui.mget('storage_gb') || '';

  return Skeletons.Box.X({
    className: `${pfx}__urow`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__ucol user`,
        kids: [
          Skeletons.UserProfile({
            className: `${pfx}__uavatar`,
            id: uid,
            firstname: fname || fullname,
            lastname: lname,
            fullname,
            type: 'thumb',
            auto_color: 1,
            live_status: 0,
          }),
          Skeletons.Box.Y({
            className: `${pfx}__uidentity`,
            kids: [
              Skeletons.Note({ className: `${pfx}__uname`,  content: fullname }),
              Skeletons.Note({ className: `${pfx}__uemail`, content: email    }),
            ],
          }),
        ],
      }),
      Skeletons.Box.X({
        className: `${pfx}__ucol role`,
        kids: [Skeletons.Note({ className: `${pfx}__role-badge`, content: role })],
      }),
      Skeletons.Box.X({
        className: `${pfx}__ucol usage`,
        kids: [
          Skeletons.Box.X({
            className: `${pfx}__usage-track`,
            kids: [
              Skeletons.Box.X({
                className: `${pfx}__usage-fill`,
                styleOpt: { width: `${usagePct}%` },
              }),
            ],
          }),
          Skeletons.Note({ className: `${pfx}__usage-pct`, content: `${usagePct}%` }),
        ],
      }),
      Skeletons.Note({ className: `${pfx}__ucol storage`, content: storageGb }),
      Skeletons.Box.X({
        className: `${pfx}__ucol action`,
        kids: [
          Skeletons.Button.Svg({
            className: `${pfx}__settings-btn`,
            ico: 'settings',
            service: 'user-storage-settings',
            uiHandler: [ui],
          }),
        ],
      }),
    ],
  });
};
