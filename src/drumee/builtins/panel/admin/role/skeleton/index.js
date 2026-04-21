module.exports = function (ui) {
  const pfx = ui.fig.family;
  return Skeletons.Box.Y({
    className: `${pfx}__main`,
    debug: __filename,
    kids: [
      require('./topbar')(ui),
      require('./stats')(ui),
      Skeletons.Box.X({
        className: `${pfx}__rules-row`,
        kids: [
          require('./creation-rules')(ui),
          require('./invite-rules')(ui),
        ],
      }),
      require('./pending')(ui),
    ],
  });
};
