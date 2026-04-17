module.exports = function (ui) {
  const pfx = ui.fig.family;
  return Skeletons.Box.Y({
    className: `${pfx}__main`,
    debug: __filename,
    kids: [
      require('./table-header')(ui),
      Skeletons.Box.Y({
        className: `${pfx}__content`,
        sys_pn: 'content',
        partHandler: ui,
      }),
    ],
  });
};
