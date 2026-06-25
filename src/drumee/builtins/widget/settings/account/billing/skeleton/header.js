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

  return Skeletons.Box.X({
    className: `${figTrigger}-main`,
    sys_pn: `${fig}__tabs-trigger`,
    kids: [
      item(ui, {content:LOCALE.MONTHLY, discountRate:0, pos:0, service:"select-plan"}),
      item(ui, {content:LOCALE.YEARLY, discountRate:15, pos:1, service:"select-plan"}),
      item(ui, {content:LOCALE.CHECKOUT, discountRate:0, pos:2, service:"checkout"})
    ],
  });
}

export default billing_tabs_trigger;
