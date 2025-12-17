const { folder_logo } = require("../../../../skeleton/toolkit/logo");

/**
 * 
 * @param {*} ui 
 * @param {*} opt 
 */
function item(ui, label, widget) {
  return Skeletons.Box.G({
    className: `${ui.fig.family}__item ${ui.fig.group}__item`,
    uiHandler: ui,
    kids: [
      Skeletons.Note({
        className: `${ui.fig.family}__item-label ${ui.fig.group}__item-label`,
        content: label,
      }),
      widget,
    ],
  });
}

/**
 * 
 * @param {*} ui 
 * @param {*} opt 
 */
function text(ui, label) {
  return Skeletons.Note({
    className: `${ui.fig.family}__item-text ${ui.fig.group}__item-text`,
    content: label,
  })
}

/**
 * 
 * @param {*} ui 
 * @param {*} opt 
 * @returns 
 */
function settings_body(ui, opt) {
  const fig = `${ui.fig.family}`;
  return Skeletons.Box.Y({
    className: `${fig}__container`,
    debug: __filename,
    kids: [
      Skeletons.Box.Y({
        className: `${fig}__content`,
        kids: [
          Skeletons.Box.X({
            className: `${ui.fig.group}__vignette ${fig}__vignette`,
            kids: [{
              kind: 'media_grid',
              className: `${ui.fig.group}__vignette-media ${fig}__vignette-media`,
              filetype: ui.mget(_a.filetype),
              area: ui.mget(_a.area),
              mode: _a.vignette
            }]
          }),
          Skeletons.Box.Y({
            className: `${ui.fig.group}__items ${fig}__items`,
            kids: [
              item(ui, LOCALE.OWNER, text(ui,"0")),
              item(ui, "okok type", text(ui, LOCALE[`AREA_${ui.mget(_a.area).toUpperCase()}_LABEL`])),
              item(ui, LOCALE.SIZE, text(ui,"0")),
              item(ui, LOCALE.MEMBERS, text(ui,"0")),
              item(ui, LOCALE.CREATED, text(ui,"0")),
              item(ui, LOCALE.LAST_CHANGE, text(ui,"0")),
            ]
          })
        ]
      }),
    ],
  });
}

export default settings_body;
