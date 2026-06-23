/**
 * Get content based on current tab
 * Tab 2 (checkout): return checkout layout
 * Other tabs: return plans layout with footer
 * @param {Object} ui - UI instance
 * @returns {Object} Skeletons component
 */
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

/**
 * Popup top bar: title + close. Rendered when settings_billing is mounted as
 * a popup over the Settings page (settings_main overlay). The close button
 * bubbles "billing-close" up to the host, which clears the overlay.
 * @param {Object} ui - UI instance
 * @returns {Object} Skeletons component
 */
function popupHeader(ui) {
  const fig = ui.fig.family;
  return Skeletons.Box.X({
    className: `${fig}__popup-header`,
    kids: [
      Skeletons.Note({
        className: `${fig}__popup-title`,
        content: LOCALE.BILLING_SUBSCRIPTION,
      }),
      Skeletons.Button.Svg({
        className: `${fig}__popup-close`,
        ico: "cross",
        service: "billing-close",
        uiHandler: [ui],
        bubble: false,
      }),
    ],
  });
}

/**
 * Create main billing layout with header tabs and content container.
 * Wrapped in a popup shell (title bar + scrollable body) so it renders as an
 * overlay popup inside Settings.
 * @param {Object} ui - UI instance
 * @returns {Object} Skeletons component
 */
function billing(ui) {
  const fig = ui.fig.family;
  const header = require("./header").default(ui);
  const content = getContent(ui);

  const contentWrapper = Skeletons.Box.Y({
    className: `${fig}__content-container`,
    sys_pn: `${fig}__content`,
    kids: [content],
  });

  const body = Skeletons.Box.Y({
    className: `${fig}__body`,
    kids: [
      header,
      contentWrapper,
    ],
  });

  return Skeletons.Box.Y({
    className: `${fig}__main`,
    kids: [
      ui._popup ? popupHeader(ui) : null,
      body,
    ].filter(Boolean),
  });
}

export default billing;
export { getContent };
