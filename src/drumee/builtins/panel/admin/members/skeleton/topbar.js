module.exports = function (ui) {
  const pfx = ui.fig.family;
  return Skeletons.Box.X({
    className: `${pfx}__topbar`,
    kids: [
      Skeletons.Box.Y({
        className: `${pfx}__topbar-info`,
        kids: [
          Skeletons.Note({ className: `${pfx}__title`, content: LOCALE.MEMBERS }),
          Skeletons.Note({ className: `${pfx}__subtitle`, content: LOCALE.MEMBERS_SUBTITLE }),
        ],
      }),
      Skeletons.Box.X({
        className: `${pfx}__topbar-actions`,
        kids: [
          Skeletons.Entry({
            className: `${pfx}__search`,
            sys_pn: 'search-input',
            placeholder: LOCALE.SEARCH_MEMBER,
            mode: 'commit',
            service: 'search',
            uiHandler: [ui],
          }),
          Skeletons.Button.Label({
            className: `${pfx}__invite-btn`,
            ico: 'user-add',
            label: LOCALE.INVITE,
            service: 'invite-member',
            uiHandler: [ui],
          }),
        ],
      }),
    ],
  });
};
