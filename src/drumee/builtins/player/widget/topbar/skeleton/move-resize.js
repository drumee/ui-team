// ==================================================================== *
//   Copyright Xialia.com  2011-2026
//   FILE : builtins/player/widget/topbar/skeleton/move-resize
//   TYPE : Skeleton
// ==================================================================== *

/**
 * "Move & Resize" — the expand-icon control in the topbar.
 *
 * Same shape as `zoomMenu()` in window/skeleton/toolkit: clicking the
 * trigger zooms directly, hovering reveals a panel of window presets. The
 * services are the folder window's own vocabulary, so every window snaps
 * through one code path (builtins/window/snap).
 *
 * The four preset glyphs are drawn in CSS (outline box + inner block),
 * matching the Figma, which builds them from plain shapes rather than an
 * icon. `data-preset` on each button selects the glyph; `data-active`
 * marks the layout the window is currently in.
 */

const PRESETS = [
  { preset: "full", service: "window-zoom" },
  { preset: "left", service: "window-tile-left" },
  { preset: "right", service: "window-tile-right" },
  { preset: "center", service: "window-reframe" },
];

/**
 * @param {object} ctx     { ui, cn, wcn }
 * @param {object} action  TopbarAction, plus two options of its own:
 *
 *   presets  string[]  which presets to offer, in PRESETS order. Omit for
 *                      all four. A player that cannot honour a layout should
 *                      leave it out rather than render a dead button.
 *   active   string    the preset to highlight before the user picks one,
 *                      i.e. the layout the window opens in. Note that the
 *                      highlighted preset is deliberately NOT clickable
 *                      (see the skin), so this must match reality.
 */
const __player_topbar_move_resize = function (ctx, action) {
  const { ui, cn, wcn } = ctx;
  const snap = `${cn}__snap`;
  const wsnap = `${wcn}__snap`;

  const presets = _.isEmpty(action.presets)
    ? PRESETS
    : PRESETS.filter(({ preset }) => action.presets.includes(preset));

  return Skeletons.Box.X({
    debug: __filename,
    className: `${snap}-wrapper ${wsnap}-wrapper`,
    sys_pn: action.id,
    kids: [
      // No service: the trigger only reveals the preset panel on hover.
      // Zooming still happens, from the "full" preset inside the panel,
      // which emits the same `window-zoom`.
      Skeletons.Button.Svg({
        ico: action.icon || "desktop_fullview",
        className: `${snap}-trigger ${wsnap}-trigger icon`,
        sys_pn: action.triggerPn,
        partHandler: ui,
      }),
      Skeletons.Box.Y({
        className: `${snap}-menu ${wsnap}-menu`,
        sys_pn: "snap-menu",
        kids: [
          Skeletons.Note({
            content: LOCALE.MOVE_RESIZE,
            active: 0,
            className: `${snap}-label ${wsnap}-label`,
          }),
          Skeletons.Box.X({
            className: `${snap}-presets ${wsnap}-presets`,
            kids: presets.map(({ preset, service }) =>
              Skeletons.Box.X({
                className: `${snap}-preset ${wsnap}-preset`,
                sys_pn: `snap-${preset}`,
                service,
                uiHandler: [ui],
                dataset: { preset, active: preset === action.active ? 1 : 0 },
                kidsOpt: { active: 0 },
                // The glyph is pure CSS: this Box is the outline, its kid
                // the inner block whose width/position the skin varies by
                // `data-preset`.
                kids: [
                  Skeletons.Box.X({
                    className: `${snap}-glyph ${wsnap}-glyph`,
                    kids: [
                      Skeletons.Element({
                        className: `${snap}-glyph-fill ${wsnap}-glyph-fill`,
                      }),
                    ],
                  }),
                ],
              }),
            ),
          }),
        ],
      }),
    ],
  });
};

module.exports = __player_topbar_move_resize;
