/**
 * The Files grid with nothing in it — Figma 176:42043 (frame 176:42052).
 *
 * A workspace whose Files tab is empty used to show an empty box: a filter bar
 * over blank space, with no hint of what the tab is for or of how to put
 * something in it. The design answers both — it names what makes files here
 * different from files anywhere else, and puts the three ways of adding one
 * under the sentence.
 *
 * Keyed on `ui.fig.group` ("window"), like the grid it sits beside: this is the
 * folder window's empty state, and the same grid skeleton serves every window
 * that renders one.
 *
 * The three actions are REAL — they raise the services the window already
 * handles for the same three gestures. The tour draws a picture of this pane
 * (modules/desk/tutorial/skeleton/toolkit/files.js) from the same frame; that
 * one is scenery and this one is the product.
 */

const ACTIONS = [
  {
    // The same flow the topbar's + New menu offers, and the same one the
    // migrate tour teaches.
    key: "migrate",
    label: () => LOCALE.MIGRATE_FROM_GDRIVE,
    service: "launch-gdrive-migration",
    primary: true,
  },
  { key: "new", label: () => LOCALE.NEW, service: "open-new-menu", ico: "topbar-add" },
  { key: "upload", label: () => LOCALE.UPLOAD, service: "upload", ico: "upload-simple" },
];

/**
 * @param {Object} ui the window rendering the grid
 * @returns {Object} the empty state, hidden until the grid says it is empty
 */
module.exports = function (ui) {
  const p = `${ui.fig.group}__fe`;

  const action = (a) =>
    Skeletons.Box.X({
      className: `${p}-btn ${p}-btn--${a.primary ? "primary" : "ghost"}`,
      service: a.service,
      uiHandler: [ui],
      kids: [
        a.ico
          ? Skeletons.Image.Svg({ active: 0, ico: a.ico, className: `${p}-btn-ico` })
          : null,
        Skeletons.Note({ active: 0, className: `${p}-btn-label`, content: a.label() }),
      ].filter(Boolean),
    });

  return Skeletons.Box.Y({ active: 0,
    className: `${p}-hero`,
    sys_pn: "files-empty",
    partHandler: ui,
    kids: [
      Skeletons.Note({ active: 0, className: `${p}-title`, content: LOCALE.FILES_EMPTY_TITLE }),
      Skeletons.Note({ active: 0, className: `${p}-desc`, content: LOCALE.FILES_EMPTY_DESC }),
      Skeletons.Box.X({ active: 0,
        className: `${p}-actions`,
        kids: ACTIONS.map(action),
      }),
    ],
  });
};
