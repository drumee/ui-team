const { folder_logo } = require("../../../../skeleton/toolkit/logo");

/**
 * 
 * @param {*} ui 
 * @param {*} opt 
 */
function item(ui, label, widget) {
  return Skeletons.Box.X({
    className: `${ui.fig.family}__item ${ui.fig.group}__item`,
    uiHandler: ui,
    kids: [
      Skeletons.Note({
        content: label,
        type: _a.toggle,
      }),
      widget,
    ],
  });
}

/**
 * 
 * @param {*} ui 
 * @param {*} opt 
 * @returns 
 */
function settings_body(ui, opt) {
  const fig = `${ui.fig.family}-content`;

  return Skeletons.Box.Y({
    className: `${fig}__container`,
    debug: __filename,
    kids: [
      Skeletons.Box.Y({
        className: `${fig}__body-content`,
        kids: [
          Skeletons.Box.X({
            className: `${ui.fig.group}__vignette`,
            kids: [{
              kind: 'media_grid',
              className: `${ui.fig.group}__vignette-media`,
              filetype: ui.mget(_a.filetype),
              area: ui.mget(_a.area),
              mode: _a.vignette
            }]
          }),
          item(ui, LOCALE.OWNER),
          item(ui, LOCALE.TYPE),
          item(ui, LOCALE.SIZE),
          item(ui, LOCALE.MERMBERS),
          item(ui, LOCALE.CREATED),
          item(ui, LOCALE.LAST_CHANGE),
        ]
      }),
    ],
  });
}

export default settings_body;
