// ==================================================================== *
//   Copyright Xialia.com  2011-2026
//   FILE : builtins/player/image/skeleton/topbar
//   TYPE : Skeleton
// ==================================================================== *

/**
 * Image-player header — Figma "file player/action" (3228:280002).
 *
 * Layout lives in the shared topbar widget; this file is only the image
 * player's configuration of it. The widget injects gear, expand and close
 * itself, so all that is declared here is the identity block, the gear's
 * menu contents, and the one action the image player adds.
 *
 * That extra action is save-rotation: it stays in the header so a pending
 * rotation can be committed explicitly, but the skin keeps it out of the
 * flow until `data-pending="1"` is set (see `_syncRotationPending` in the
 * player), so the resting header matches the design.
 */

const Topbar = require("builtins/player/widget/topbar");

module.exports = function (ui) {
  return Topbar(ui, {
    left: {
      fileTypeIcon: "bg-image",
      title: ui.model.get(_a.filename),
    },
    right: {
      before: [
        {
          id: "save-rotation-button",
          type: "button",
          icon: "apps-floppy",
          className: "icon save-rotation",
          service: "save-rotation",
          dataset: { pending: 0 },
        },
      ],
    },
    defaults: {
      "folder-settings": { menu: ui.fileMenu() },
      close: { service: "close-player" },
    },
  });
};
