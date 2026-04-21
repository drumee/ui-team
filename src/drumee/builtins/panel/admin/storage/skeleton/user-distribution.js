module.exports = function (ui) {
  const pfx  = ui.fig.family;
  const from = ui.mget('user_page_from') || 1;
  const to   = ui.mget('user_page_to')   || 25;
  const total= ui.mget('user_total')     || 0;

  return Skeletons.Box.Y({
    className: `${pfx}__user-dist`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__user-dist-header`,
        kids: [
          Skeletons.Note({ className: `${pfx}__user-dist-title`, content: LOCALE.USER_STORAGE_DISTRIBUTION }),
          Skeletons.Box.X({
            className: `${pfx}__sort-wrap`,
            kids: [
              Skeletons.Note({ className: `${pfx}__sort-label`, content: LOCALE.SORT_BY }),
              Skeletons.Button.Label({
                className: `${pfx}__sort-btn`,
                label: ui.mget('sort_label') || LOCALE.USAGE_HIGH_TO_LOW,
                ico: 'arrow-down',
                sys_pn: 'sort-btn',
                service: 'sort-users',
                uiHandler: [ui],
              }),
            ],
          }),
        ],
      }),
      Skeletons.Box.X({
        className: `${pfx}__user-header`,
        kids: [
          Skeletons.Note({ className: `${pfx}__ucol user`,    content: LOCALE.USER            }),
          Skeletons.Note({ className: `${pfx}__ucol role`,    content: LOCALE.ROLE            }),
          Skeletons.Note({ className: `${pfx}__ucol usage`,   content: LOCALE.USAGE_PERCENTAGE }),
          Skeletons.Note({ className: `${pfx}__ucol storage`, content: LOCALE.STORAGE_GB      }),
          Skeletons.Note({ className: `${pfx}__ucol action`,  content: LOCALE.ACTION          }),
        ],
      }),
      Skeletons.List.Smart({
        className: `${pfx}__user-list`,
        sys_pn: 'user-list',
        flow: _a.none,
        spinner: true,
        spinnerWait: 300,
        api: ui.getUsers.bind(ui),
        itemsOpt: { kind: 'admin_storage_user', uiHandler: [ui] },
        vendorOpt: Preset.List.Orange_e,
        evArgs: Skeletons.Note(LOCALE.NO_USERS, `${pfx}__empty`),
      }),
      Skeletons.Box.X({
        className: `${pfx}__user-footer`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__user-showing`,
            content: `${LOCALE.SHOWING} ${from}–${to} ${LOCALE.OF} ${total.toLocaleString()} ${LOCALE.ENTRIES}`,
            sys_pn: 'user-showing-text',
          }),
          Skeletons.Box.X({
            className: `${pfx}__user-pager`,
            kids: [
              Skeletons.Button.Svg({ className: `${pfx}__user-pager-btn`, ico: 'arrow-left',  service: 'prev-users', uiHandler: [ui] }),
              Skeletons.Button.Svg({ className: `${pfx}__user-pager-btn`, ico: 'arrow-right', service: 'next-users', uiHandler: [ui] }),
            ],
          }),
        ],
      }),
    ],
  });
};
