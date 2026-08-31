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
 * The confetti is the frame's own bitmap, committed rather than redrawn: it is
 * ~90 scattered marks at a dozen angles and colours, and a CSS approximation
 * would be both bigger and wrong. `mix-blend-mode: darken` is the frame's, and
 * it is what keeps the marks from washing out the white pane under them.
 */

const { filesPane } = require("./files");

const CONFETTI = require("assets/tutorial/confetti.png").default;

const pfx = (ui) => `${ui.fig.group}__congrats`;

/**
 * @param {Object} ui the step widget
 * @returns {Object} the finished workspace, celebrating
 */
function congratsScreen(ui) {
  const p = pfx(ui);
  return Skeletons.Box.Y({ active: 0,
    className: `${p}-stage`,
    // The spotlight lights this, and the callout hangs off it.
    sys_pn: "congrats-stage",
    partHandler: ui,
    kids: [
      filesPane(ui),
      // A sibling, not a child of the pane: it covers the whole stage and must
      // not be clipped by the pane's own overflow, nor take a click meant for
      // anything under it.
      Skeletons.Element({ active: 0,
        className: `${p}-confetti`,
        content: `<img src="${CONFETTI}" alt="">`,
      }),
    ],
  });
}

module.exports = { congratsScreen };
