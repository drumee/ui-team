// ==================================================================== *
//   Copyright Xialia.com  2011-2026
//   FILE : builtins/player/image/skeleton/topbar
//   TYPE : Skeleton
// ==================================================================== *

/**
 * Image-player header — Figma "file player/action" (3228:280002).
 *
 * Left: the file-type tile + filename. Right: gear (opens the file's
 * context menu), expand (Move & Resize), close.
 *
 * The download / rotate buttons that used to sit in this row now live in
 * the gear menu. The save-rotation button is the one exception: it stays
 * in the header so a pending rotation can be committed explicitly, but
 * the skin hides it until `data-pending="1"` is set (see `_rotate` in the
 * player), so the resting header matches the design.
 */

module.exports = function (ui, size) {
  size = size || ui.size;

  const identity = Skeletons.Box.X({
    className: `${ui.fig.family}-topbar__identity`,
    service: _e.raise,
    uiHandler: ui,
    kids: [
      Skeletons.Box.X({
        className: `${ui.fig.family}-topbar__filetype`,
        kidsOpt: { active: 0 },
        kids: [
          Skeletons.Image.Svg({
            ico: "image",
            className: `${ui.fig.family}-topbar__filetype-icon`,
          }),
        ],
      }),
      Skeletons.Note({
        className: `${ui.fig.group}__title`,
        sys_pn: "player-title",
        content: ui.model.get(_a.filename),
        service: _e.raise,
        uiHandler: ui,
      }),
    ],
  });

  // Only meaningful while a client-side rotation is waiting to be pushed
  // to the server; the skin keeps it out of the flow until then.
  const saveRotationIcon = Skeletons.Button.Svg({
    ico: "checked-circle",
    sys_pn: "save-rotation-button",
    className: "icon save-rotation",
    service: "save-rotation",
    uiHandler: ui,
    dataset: { pending: 0 },
  });

  const gear = Skeletons.Button.Svg({
    ico: "gear-header",
    sys_pn: "ctrl-gear",
    className: "icon gear",
    service: "open-file-menu",
    uiHandler: ui,
  });

  // NOT `ctrl-close`: the slider's fullscreen action bar already claims
  // that part name on the same handler (see skeleton/slider.js).
  const close = Skeletons.Button.Svg({
    ico: "cross",
    sys_pn: "ctrl-close-window",
    className: "icon close",
    service: "close-player",
    uiHandler: ui,
  });

  const actions = Skeletons.Box.X({
    className: `${ui.fig.family}-topbar__actions`,
    sys_pn: "commands",
    kids: [saveRotationIcon, gear, require("./move-resize")(ui), close],
  });

  return Skeletons.Box.X({
    className: `${ui.fig.group}__header container u-jc-sb ${ui.fig.family}-topbar`,
    debug: __filename,
    sys_pn: "topbar",
    justify: _a.right,
    kids: [
      Skeletons.Box.X({
        className: `${ui.fig.group}__header main u-ai-center`,
        service: _e.raise,
        uiHandler: ui,
        kids: [identity, actions],
      }),
    ],
  });
};
