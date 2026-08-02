// ==================================================================== *
//   Copyright Xialia.com  2011-2026
//   FILE : builtins/player/image/skeleton/move-resize
//   TYPE : Skeleton
// ==================================================================== *

/**
 * "Move & Resize" — the expand-icon control in the player header.
 *
 * Same shape as `zoomMenu()` in window/skeleton/toolkit: clicking the
 * trigger zooms directly, hovering reveals a panel of window presets. The
 * services are the folder window's own vocabulary, so both windows snap
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

const __player_image_move_resize = function (ui) {
  const cn = `${ui.fig.family}-topbar__snap`;

  return Skeletons.Box.X({
    debug: __filename,
    className: `${cn}-wrapper`,
    sys_pn: "snap-wrapper",
    kids: [
      Skeletons.Button.Svg({
        ico: "expand",
        className: `${cn}-trigger icon`,
        sys_pn: "ctrl-expand",
        service: "window-zoom",
        uiHandler: [ui],
        partHandler: ui,
      }),
      Skeletons.Box.Y({
        className: `${cn}-menu`,
        sys_pn: "snap-menu",
        kids: [
          Skeletons.Note({
            content: LOCALE.MOVE_RESIZE,
            active: 0,
            className: `${cn}-label`,
          }),
          Skeletons.Box.X({
            className: `${cn}-presets`,
            kids: PRESETS.map(({ preset, service }) =>
              Skeletons.Box.X({
                className: `${cn}-preset`,
                sys_pn: `snap-${preset}`,
                service,
                uiHandler: [ui],
                dataset: { preset },
                kidsOpt: { active: 0 },
                // The glyph is pure CSS: this Box is the outline, its kid
                // the inner block whose width/position the skin varies by
                // `data-preset`.
                kids: [
                  Skeletons.Box.X({
                    className: `${cn}-glyph`,
                    kids: [Skeletons.Element({ className: `${cn}-glyph-fill` })],
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

module.exports = __player_image_move_resize;
