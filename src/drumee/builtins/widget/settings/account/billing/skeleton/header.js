// Product copy (pricing table 2026-07-29): yearly is 10 x monthly — two
// months free — and the badge states the table's published figure, 16.5%.
// (The exact arithmetic is 2/12 = 16.7%; the copy under-promises by 0.2pt,
// which is the safe direction.) The Stripe yearly prices were moved to
// 10 x monthly ($290/$990) the same day, so the figure is no longer a claim
// the checkout contradicts.
const YEARLY_SAVING = 16.5;

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
    item(ui, {content:LOCALE.YEARLY, discountRate:YEARLY_SAVING, pos:1, service:"select-plan"}),
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
