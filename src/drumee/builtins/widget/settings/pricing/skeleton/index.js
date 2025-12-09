/**
 *
 * @param {*} ui
 * @param {*} opt
 * @returns
 */
function settings_body(ui) {
  const header = require("./header").default(ui);
  const content = require("./content").default(ui);

  const fig = `${ui.fig.family}`;

  return Skeletons.Box.G({
    className: `${fig}__main`,
    debug: __filename,
    kids: [
      Skeletons.Box.Y({
        className: `${fig}__container`,
        kids: [header],
      }),
      Skeletons.Box.Y({
        className: `${fig}__container`,
        kids: [content],
      }),
    ],
  });
}

export default settings_body;
