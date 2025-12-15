/**
 *
 * @param {*} ui
 * @param {*} opt
 * @returns
 */
function billing(ui) {
  const fig = `${ui.fig.family}-billing`;
  const tabsTrigger = require("./tabs-trigger").default(ui);
  const monthly = require("./monthly").default(ui);
  const yearly = require("./yearly").default(ui);
  const footer = require("./footer").default(ui);

  return Skeletons.Box.Y({
    className: `${fig} main`,
    debug: __filename,
    kids: [
      tabsTrigger,
      // monthly,
      yearly,
      footer,
    ],
  });
}

export default billing;
