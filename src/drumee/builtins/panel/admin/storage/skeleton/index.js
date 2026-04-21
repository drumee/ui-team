module.exports = function (ui) {
  const pfx = ui.fig.family;
  return Skeletons.Box.Y({
    className: `${pfx}__main`,
    debug: __filename,
    kids: [
      require('./topbar')(ui),
      Skeletons.Box.X({
        className: `${pfx}__overview`,
        kids: [
          require('./capacity')(ui),
          require('./alerts')(ui),
        ],
      }),
      require('./versioning')(ui),
      require('./user-distribution')(ui),
    ],
  });
};
