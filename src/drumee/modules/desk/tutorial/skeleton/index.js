/**
 * The tour's shell.
 *
 * Drumee 2.0 stacks it topbar-over-everything: the utility bar spans the full
 * width, and the dark rail starts beneath it. The 1.x shell put the rail
 * first and the topbar inside the main column, which is why this is a
 * restructure rather than a restyle.
 */
module.exports = function (ui) {
  const fig = ui.fig.family;
  return Skeletons.Box.Y({ active: 0,
    className: `${fig}__layout`,
    kids: [
      require('./topbar')(ui),
      Skeletons.Box.X({ active: 0,
        className: `${fig}__body`,
        kids: [
          require('./sidebar')(ui),
          // The step slot starts EMPTY. The host feeds _widgetAt(0) once this
          // shell has mounted, so the first screen comes from the registry
          // like every other screen does — planting a kind here hardcodes
          // step one and every tour opens on it regardless of which tour was
          // asked for.
          Skeletons.Box.Y({ active: 0,
            className: `${fig}__content`,
            sys_pn: _a.content,
          }),
        ],
      }),
      { kind: 'tutorial_spotlight', sys_pn: 'spotlight', partHandler: ui },
    ],
  });
};
