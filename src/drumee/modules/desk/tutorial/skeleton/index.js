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
          // The step slot starts EMPTY. It used to plant tutorial_workspace
          // here, which was right when there was one tour and it always began
          // with the workspace step — but it hardcodes step one, so every
          // contextual tour rendered the workspace step regardless of which
          // tour was asked for. The host feeds _widgetAt(0) once this shell has
          // mounted, so the first screen comes from the registry like every
          // other screen does.
          Skeletons.Box.Y({
            className: `${fig}__content`,
            sys_pn: _a.content,
          })
        ],
      }),
      { kind: 'tutorial_spotlight', sys_pn: 'spotlight', partHandler: ui },
    ],
  });
};
