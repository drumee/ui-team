module.exports = function (ui) {
  const fig = ui.fig.family;
  return Skeletons.Box.Y({
    className: `${fig}__main`,
    kids: [
      require('./workspace-grid')(ui),
      Skeletons.Wrapper.Y({
        className: `${fig}__overlay`,
        sys_pn: 'overlay',
        partHandler: ui,
      }),
    ],
  });
};
