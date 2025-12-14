/**
 *
 * @param {*} ui
 * @param {*} opt
 * @returns
 */
function billing(ui) {
  const fig = `${ui.fig.family}-billing`;
  const header = require("./header").default(ui);
  const content = require("./content").default(ui);

  return Skeletons.Box.Y({
    className: `${fig} main`,
    debug: __filename,
    kids: [header, content],
  });
}

export default billing;
