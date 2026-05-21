module.exports = function (ui) {
  const fig = ui.fig.family;
  return [
    Skeletons.Box.Y({ className: `${fig}__vignette` }),
    Skeletons.Box.Y({
      className: `${fig}__callout`,
      sys_pn: 'callout',
      partHandler: ui,
    }),
  ];
};
