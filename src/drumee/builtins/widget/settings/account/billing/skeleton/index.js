/**
 *
 * @param {*} ui
 * @param {*} opt
 * @returns
 */
function getContent(ui) {
  const fig = ui.fig.family;
  const tab = ui.tab || 0;
  
  // Tab 0: Monthly, Tab 1: Yearly, Tab 2: Checkout
  if (tab === 2) {
    return require("./checkout").default(ui);
  } else {
    const cycle = tab === 0 ? "monthly" : "yearly";
    const plans = require("./plans").default(ui, cycle);
    const footer = require("./footer").default(ui);
    
    return Skeletons.Box.Y({
      className: `${fig}__content-wrapper`,
      kids: [
        plans,
        footer,
      ],
    });
  }
}

/**
 *
 * @param {*} ui
 * @param {*} opt
 * @returns
 */
function billing(ui) {
  const fig = ui.fig.family;
  const header = require("./header").default(ui);
  const content = getContent(ui);

  return Skeletons.Box.Y({
    className: `${fig}__main`,
    debug: __filename,
    sys_pn: `${fig}__content`,
    kids: [
      header,
      content,
    ],
  });
}

export default billing;
export { getContent };
