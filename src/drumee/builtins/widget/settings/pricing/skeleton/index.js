const { folder_logo } = require("../../../../skeleton/toolkit/logo");

/**
 * 
 * @param {*} ui 
 * @param {*} opt 
 */
function item(ui, label, widget="") {
  return Skeletons.Box.X({
    className: `${ui.fig.family}__item ${ui.fig.group}__item`,
    uiHandler: ui,
    kids: [
      folder_logo(ui, {area:_a.personal}),
      Skeletons.Note({
        className: `${ui.fig.family}__item-label ${ui.fig.group}__item-label`,
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
  const fig = `${ui.fig.family}`;

  return Skeletons.Box.G({
    className: `${fig}__main`,
    debug: __filename,
    kids: [
      Skeletons.Box.Y({
        className: `${fig}__container`,
        kids: [
          folder_logo(ui)
        ]
      }),
      Skeletons.Box.Y({
        className: `${fig}__container`,
        kids: [
          item(ui, "label")
        ]
      }),
    ],
  });
}

export default settings_body;
