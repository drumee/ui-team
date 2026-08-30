module.exports = function (ui) {
  const fig = ui.fig.family;
  return [
    // Flat, not a vignette. The 2.0 design dims the whole mock evenly and
    // raises the surface being taught above it (spotlight/index.js _light).
    Skeletons.Box.Y({ className: `${fig}__scrim` }),
    Skeletons.Box.Y({
      className: `${fig}__callout`,
      sys_pn: 'callout',
      partHandler: ui,
    }),
  ];
};
