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
          { kind: 'tutorial_workspace' },
        ],
      }),
    ],
  });
};
