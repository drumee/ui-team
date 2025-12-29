/**
 *
 * @param {*} ui
 * @param {*} opt
 * @returns
 */
function getContent(ui) {
  const fig = ui.fig.family;
  // Use state.currentTab if available, otherwise fallback to ui.tab
  const tab = ui.state?.currentTab ?? ui.tab ?? 0;
  
  // Tab 0: Monthly, Tab 1: Yearly, Tab 2: Checkout
  if (tab === 2) {
    return require("./checkout").default(ui);
  } else {
    // Use state.plansTab.cycle if available, otherwise determine from tab
    const cycle = ui.state?.plansTab?.cycle ?? (tab === 0 ? "monthly" : "yearly");
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

  // Wrap content in a container with sys_pn for ensurePart to find
  const contentWrapper = Skeletons.Box.Y({
    className: `${fig}__content-container`,
    sys_pn: `${fig}__content`,
    kids: [content],
  });

  return Skeletons.Box.Y({
    className: `${fig}__main`,
    debug: __filename,
    kids: [
      header,
      contentWrapper,
    ],
  });
}

export default billing;
export { getContent };
