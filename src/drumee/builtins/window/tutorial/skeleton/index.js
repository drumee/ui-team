/**
 * The in-window tour's shell.
 *
 * Two kids and no chrome. The desk host draws a topbar and a dark rail because
 * it has replaced the desk with a picture of one; this host is laid over the
 * real folder window, so the only thing it owes the step is a box to draw in
 * and a spotlight to point with.
 *
 * WHY TWO CLASS SETS ON EVERY NODE. The step widgets and their callout are
 * styled through `.tutorial-main` as an ANCESTOR — the responsive tiers and
 * `--pane-fit` (../../../modules/desk/tutorial/skin/index.scss), the callout's
 * narrow/mobile/short forms (skin/tooltip.scss), the empty-state and files
 * skins, and the chat step's own breakpoints. `tutorial-main__layout` is also
 * the class the spotlight's z-index promotion stops climbing at
 * (spotlight/index.js LAYOUT_CLASS); without it the walk would leave the
 * overlay and start lifting the folder window's real chrome out of the scrim.
 *
 * Wearing the classes rather than editing those selectors is what keeps
 * `desk_tutorial` untouched: nothing about the working tour changes, and this
 * host inherits every tier the design already specifies.
 *
 * The `window-tutorial__*` set carries only what is different — the overlay's
 * own geometry (skin/index.scss).
 */
module.exports = function (ui) {
  const fig = ui.fig.family;
  return Skeletons.Box.Y({ active: 0,
    className: `${fig}__layout tutorial-main__layout`,
    kids: [
      // EMPTY on purpose. The host feeds the first step from the registry once
      // this shell has mounted, exactly as it feeds every later one. Planting a
      // kind here hardcodes step one, and every tour then opens on it whatever
      // was asked for.
      Skeletons.Box.Y({ active: 0,
        className: `${fig}__content tutorial-main__content`,
        sys_pn: _a.content,
      }),
      // After the content, so the scrim and the callout sit later in DOM order
      // as well as above it by z-index.
      { kind: 'tutorial_spotlight', sys_pn: 'spotlight', partHandler: ui },
    ],
  });
};
