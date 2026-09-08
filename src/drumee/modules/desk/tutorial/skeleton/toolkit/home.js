/**
 * The home empty state a workspace is created from — Figma 140:22684, the
 * frame the "org home -> create wp" flow opens on.
 *
 * A hero on the left (headline, one paragraph, and the CTA that opens the
 * create dialog) and, on the right, the workspace preview — which lives in
 * ./app-preview.js now, because the chat tour's opening screen draws the same
 * plate. Only the hero is this file's own.
 *
 * Note on fidelity: this frame carries no callout of its own — it is the entry
 * state the flow arrow leaves from. Everything drawn here is the design's; the
 * sentence the tour puts on it is ours.
 *
 * `home-cta` is what the callout points at, and the one live control here.
 */

const { appPreview } = require("./app-preview");

const pfx = (ui) => `${ui.fig.group}__home`;

/** The left column: headline, paragraph, CTA. */
function hero(ui) {
  const p = pfx(ui);
  return Skeletons.Box.Y({ active: 0,
    className: `${p}-hero`,
    kids: [
      Skeletons.Note({ active: 0,
        className: `${p}-title`,
        content: LOCALE.HOME_HERO_TITLE,
      }),
      Skeletons.Note({ active: 0,
        className: `${p}-desc`,
        content: LOCALE.HOME_HERO_DESC,
      }),
      // The one live control on this screen, and the only one in the tour that
      // is not on a callout.
      //
      // 140:22684 carries no callout — it is the state the flow arrow leaves
      // FROM — so the step raises it bare (`bare` in ../../workspace/index.js)
      // and this button carries the tour forward instead. That is also what it
      // does in the product: it opens the create dialog, which is the very
      // thing screen 2 draws.
      //
      // NOT `active: 0`, unlike everything else in this file: ui-core binds an
      // onclick only to a widget that is not inert, and the click has to reach
      // the STEP (`uiHandler`), whose onUiEvent already knows `next-step`. The
      // label inside stays inert so the click lands on this box.
      Skeletons.Box.X({
        className: `${p}-cta`,
        sys_pn: "home-cta",
        partHandler: ui,
        service: "next-step",
        uiHandler: [ui],
        kids: [
          Skeletons.Note({ active: 0,
            className: `${p}-cta-label`,
            content: LOCALE.CREATE_FIRST_WORKSPACE,
          }),
        ],
      }),
    ],
  });
}

/**
 * @param {Object} ui
 * @returns {Object} the home empty state
 */
function orgHome(ui) {
  const p = pfx(ui);
  return Skeletons.Box.X({ active: 0,
    className: `${p}-canvas`,
    // NOT named above the hero. 140:22684 goes straight from the rail to the
    // headline, and the line that used to sit here had no skin behind it, so
    // turning the org chrome on rendered a bare unstyled string over the hero.
    //
    // The frame names the org in a topbar chip at the top left, which this
    // shell no longer draws at all (see skeleton/index.js). The rail's own
    // Dept. entry is what says which organisation this is now.
    // Files lit and the Files grid inside it — this screen is about making a
    // workspace, and the plate says what one looks like once it exists.
    kids: [hero(ui), appPreview(ui)],
  });
}

module.exports = { orgHome };
