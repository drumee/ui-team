function getContent(ui) {
  const fig = ui.fig.family;
  const tab = ui.state?.currentTab ?? ui.tab ?? 0;
  
  if (tab === 2) {
    return require("./checkout").default(ui);
  } else {
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

function billing(ui) {
  const fig = ui.fig.family;
  const header = require("./header").default(ui);
  const content = getContent(ui);

  const contentWrapper = Skeletons.Box.Y({
    className: `${fig}__content-container`,
    sys_pn: `${fig}__content`,
    kids: [content],
  });

  return Skeletons.Box.Y({
    className: `${fig}__main`,
    kids: [
      header,
      contentWrapper,
    ],
  });
}

export default billing;
export { getContent };
