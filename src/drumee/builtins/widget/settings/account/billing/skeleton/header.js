/**
 * Create tab item for header (Monthly, Yearly, Checkout)
 * Display content and discount rate (if available)
 * @param {Object} ui - UI instance
 * @param {Object} opt - Options: content, discountRate, promo, pos, service
 * @returns {Object} Skeletons component
 */
function item(ui, opt) {
  const {content, discountRate, promo, pos, service} = opt;
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
    // is-promo repaints the SELECTED pill in the campaign coral with white
    // text (Figma 692-128029). Only the selected state changes: an unselected
    // tab keeps the plain pill and the green saving, so the promo colour marks
    // where the user IS, not one tab shouting over the other two.
    className: `${fig}-item${promo ? " is-promo" : ""}`,
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

  // The saving is MEASURED against the catalog, not stated here.
  //
  // This was a hardcoded `YEARLY_SAVING = 16.5`, the figure published with the
  // 2026-07-29 table when yearly was pinned at 10 x monthly. A hardcoded badge
  // is only ever right until the next time the prices move — and the failure
  // is asymmetric: understating the offer costs a sale, but OVERstating it
  // advertises a discount the checkout will not honour. Both halves now come
  // from the same _catPrice() the cards and the confirm dialog quote, so the
  // badge tracks the September campaign (and its end) with no code change.
  const saving = ui._yearlySavingPct ? ui._yearlySavingPct() : 0;
  const promo = ui._promoYearlyActive ? ui._promoYearlyActive() : false;

  // The Checkout tab only exists while there is something to buy. Once a
  // subscription is live the caller is already on the only self-serve tier
  // (free < team < business|sovereign, the last two sales-led), so the tab
  // would walk them into a purchase the server now refuses outright
  // (ALREADY_SUBSCRIBED). Cancel / resume live in the banner above, and a
  // month<->year switch is a subscription update, not a new checkout.
  const kids = [
    item(ui, {content:LOCALE.MONTHLY, discountRate:0, pos:0, service:"select-plan"}),
    item(ui, {content:LOCALE.YEARLY, discountRate:saving, promo, pos:1, service:"select-plan"}),
  ];
  if (!ui._checkoutTabAllowed || ui._checkoutTabAllowed()) {
    kids.push(item(ui, {content:LOCALE.CHECKOUT, discountRate:0, pos:2, service:"checkout"}));
  }

  return Skeletons.Box.X({
    // is-anim only on a render the user asked for (see
    // settings_billing._motionClass) — the active pill's little settle-in
    // animation must not replay on a background subscription re-sync.
    className: `${figTrigger}-main${ui._motionClass()}`,
    sys_pn: `${fig}__tabs-trigger`,
    kids,
  });
}

export default billing_tabs_trigger;
