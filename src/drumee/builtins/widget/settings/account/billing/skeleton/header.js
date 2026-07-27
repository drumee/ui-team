/**
 * What paying yearly actually saves, in whole percent, from the Team prices in
 * the server catalog. Returns 0 when it cannot be computed — the badge is then
 * not rendered at all, which is better than a figure nobody checked.
 * @param {Object} ui - UI instance
 * @returns {number}
 */
function yearlySaving(ui) {
  const month = Number(ui._catPrice("team", "month")) || 0;
  const year = Number(ui._catPrice("team", "year")) || 0;
  if (!month || !year) return 0;
  const full = month * 12;
  if (year >= full) return 0;
  return Math.round(((full - year) / full) * 100);
}

/**
 * Create tab item for header (Monthly, Yearly, Checkout)
 * Display content and discount rate (if available)
 * @param {Object} ui - UI instance
 * @param {Object} opt - Options: content, discountRate, pos, service
 * @returns {Object} Skeletons component
 */
function item(ui, opt) {
  const {content, discountRate, pos, service} = opt;
  const fig = `${ui.fig.family}__tabs-trigger`;

  let discountItem = "";
  if (discountRate) {
    discountItem = Skeletons.Note({
      className: `${fig}-discount`,
      content: LOCALE.SAVED + " " + `${discountRate}%`,
    });
  }
  
  let state = 0;
  const currentTab = parseInt(ui.state?.currentTab ?? ui.tab) || 0;
  const itemPos = parseInt(pos) || 0;
  if (itemPos === currentTab) {
    state = 1;
  }
  let tabs = [
    Skeletons.Note({
      className: `${fig} text`,
      content: content,
    }),
  ];
  if (discountItem) tabs.push(discountItem)
  return Skeletons.Box.X({
    className: `${fig}-item`,
    state,
    kidsOpt: { active: 0 },
    radio: `billing-radio-${ui._id}`,
    service,
    pos,
    value: pos,
    bubble: false,
    uiHandler: [ui],
    kids: tabs
  });
}

/**
 * Create header tabs trigger with 3 tabs: Monthly, Yearly, Checkout
 * @param {Object} ui - UI instance
 * @returns {Object} Skeletons component
 */
function billing_tabs_trigger(ui) {
  const fig = ui.fig.family;
  const figTrigger = `${fig}__tabs-trigger`;

  // The Checkout tab only exists while there is something to buy. Once a
  // subscription is live the caller is already on the only self-serve tier
  // (free < team < business|sovereign, the last two sales-led), so the tab
  // would walk them into a purchase the server now refuses outright
  // (ALREADY_SUBSCRIBED). Cancel / resume live in the banner above, and a
  // month<->year switch is a subscription update, not a new checkout.
  const kids = [
    item(ui, {content:LOCALE.MONTHLY, discountRate:0, pos:0, service:"select-plan"}),
    // Derived from the catalog, not asserted. The hardcoded 15% was simply
    // untrue: yearly is 11 x monthly (one month free), so $29/mo vs $319/yr is
    // an 8% saving, and the checkout tab said "1 month free" on the same choice
    // — two different claims about one price. Reading the real prices keeps the
    // badge honest if the catalog ever changes, and drops it if it cannot be
    // computed rather than printing a number nobody verified.
    item(ui, {content:LOCALE.YEARLY, discountRate:yearlySaving(ui), pos:1, service:"select-plan"}),
  ];
  if (!ui._checkoutTabAllowed || ui._checkoutTabAllowed()) {
    kids.push(item(ui, {content:LOCALE.CHECKOUT, discountRate:0, pos:2, service:"checkout"}));
  }

  return Skeletons.Box.X({
    className: `${figTrigger}-main`,
    sys_pn: `${fig}__tabs-trigger`,
    kids,
  });
}

export default billing_tabs_trigger;
