/**
 * The end of the tour — Figma 176:42043.
 *
 * Not a card. The frame is the workspace the user has just made, open on its
 * Files pane, with confetti thrown over it: the celebration IS arriving in the
 * thing you built, so the screen is the product with something scattered on
 * top rather than a modal congratulating you in front of it.
 *
 * The pane itself is the shared one every other step sits on (./files), drawn
 * unchanged — a second, congratulatory copy of the Files pane would be the same
 * drift this toolkit exists to avoid.
 *
 * THE CONFETTI IS THROWN, not painted. It was the frame's bitmap at first,
 * which is what a static mockup can show and not what the moment is: the marks
 * sat there, identical every run, and read as a texture over the pane rather
 * than as something that just happened. canvas-confetti animates it, and the
 * step fires it when the screen comes up (workspace/index.js _celebrate).
 *
 * The canvas is a sibling of the pane rather than a child: it covers the whole
 * stage, must not be clipped by the pane's own overflow, and must never take a
 * click meant for anything under it.
 */

const { filesPane } = require("./files");

const pfx = (ui) => `${ui.fig.group}__congrats`;

/**
 * @param {Object} ui the step widget
 * @returns {Object} the finished workspace, ready to celebrate
 */
function congratsScreen(ui) {
  const p = pfx(ui);
  return Skeletons.Box.Y({ active: 0,
    className: `${p}-stage`,
    // The spotlight lights this; nothing else hangs off it any more.
    sys_pn: "congrats-stage",
    partHandler: ui,
    kids: [
      filesPane(ui),
      // A raw <canvas>, not a widget: canvas-confetti wants the element itself,
      // and there is nothing here for the framework to manage.
      Skeletons.Element({ active: 0,
        className: `${p}-confetti`,
        sys_pn: "congrats-canvas",
        partHandler: ui,
        content: "<canvas></canvas>",
      }),
    ],
  });
}

module.exports = { congratsScreen };
