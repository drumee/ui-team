/**
 *
 * @param {*} ui
 * @param {*} opt
 * @returns
 */
function billing(ui) {
  const fig = ui.fig.family;
  const header = require("./header").default(ui);
  const plans = require("./plans").default(ui);
  const footer = require("./footer").default(ui);

  return Skeletons.Box.Y({
    className: `${fig}__main`,
    debug: __filename,
    kids: [
      header,
      plans,
      footer,
    ],
  });
}

export default billing;
