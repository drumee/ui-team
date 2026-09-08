/**
 * The tour's shell: the dark rail, and the pane the step draws into.
 *
 * NO TOPBAR. The 2.0 shell drew one — an org chip, a workspace breadcrumb and
 * the utility cluster, spanning the full width above the rail — and it is gone
 * from every tour. It was scenery in the strictest sense: inert on every screen
 * of every tour, pointed at by none of them, and drawn directly over the REAL
 * topbar that is mounted underneath (the tour lives in the desk's `overlay`
 * part, a sibling of desk-module-topbar__main). What the user saw was a
 * pixel-copy of the bar they already had, covering the bar they already had.
 */
module.exports = function (ui) {
  const fig = ui.fig.family;
  return Skeletons.Box.Y({ active: 0,
    className: `${fig}__layout`,
    kids: [
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
