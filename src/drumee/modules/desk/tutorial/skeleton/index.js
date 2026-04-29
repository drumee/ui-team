module.exports = function (ui) {
  const fig = ui.fig.family;
  return Skeletons.Box.X({
    className: `${fig}__layout`,
    kids: [
      require('./sidebar')(ui),
      Skeletons.Box.Y({
        className: `${fig}__main`,
        kids: [
          require('./topbar')(ui),
          require('./workspace-grid')(ui),
        ],
      }),
      // Overlay slot — fed when a tutorial step is active
      Skeletons.Wrapper.Y({
        className: `${fig}__overlay`,
        sys_pn: 'overlay',
        partHandler: ui,
      }),
    ],
  });
};
