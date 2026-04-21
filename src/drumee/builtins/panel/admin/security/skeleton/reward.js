module.exports = function (ui) {
  const pfx = ui.fig.family;
  return Skeletons.Box.Y({
    className: `${pfx}__reward-panel`,
    kids: [
      Skeletons.Box.Y({
        className: `${pfx}__reward-top`,
        kids: [
          Skeletons.Note({ className: `${pfx}__reward-title`,    content: LOCALE.REWARD_HUB }),
          Skeletons.Note({ className: `${pfx}__reward-subtitle`, content: LOCALE.REWARD_HUB_DESC }),
        ],
      }),
      Skeletons.Box.Y({
        className: `${pfx}__reward-task`,
        kids: [
          Skeletons.Box.X({
            className: `${pfx}__reward-pts-row`,
            kids: [
              Skeletons.Note({ className: `${pfx}__reward-pts`,   content: ui.mget('reward_pts')   || '+30 pts' }),
              Skeletons.Note({ className: `${pfx}__reward-badge`, content: LOCALE.ONE_TIME_BONUS }),
            ],
          }),
          Skeletons.Note({ className: `${pfx}__reward-action`, content: LOCALE.ACTIVATE_2FA }),
          Skeletons.Box.X({
            className: `${pfx}__reward-bar`,
            kids: [
              Skeletons.Box.X({
                className: `${pfx}__reward-bar-fill`,
                sys_pn: 'reward-bar-fill',
              }),
            ],
          }),
        ],
      }),
    ],
  });
};
