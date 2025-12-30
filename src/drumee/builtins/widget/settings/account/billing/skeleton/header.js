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

function billing_tabs_trigger(ui) {
  const fig = ui.fig.family;
  const figTrigger = `${fig}__tabs-trigger`;

  return Skeletons.Box.X({
    className: `${figTrigger}-main`,
    sys_pn: `${fig}__tabs-trigger`,
    kids: [
      item(ui, {content:"Monthly", discountRate:0, pos:0, service:"select-plan"}), 
      item(ui, {content:"Yearly", discountRate:15, pos:1, service:"select-plan"}), 
      item(ui, {content:"Checkout", discountRate:0, pos:2, service:"checkout"})
    ],
  });
}

export default billing_tabs_trigger;
