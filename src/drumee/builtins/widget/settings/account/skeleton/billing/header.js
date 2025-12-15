function item(ui, content, discount) {
  const fig = `${ui.fig.family}-billing__header`;

  let discountItem = "";
  if (discount) {
    discountItem = Skeletons.Note({
      className: `${fig} discount`,
      content: `Save ${discount}%`,
    });
  }

  return Skeletons.Box.X({
    className: `${fig} item`,
    // kidsOpt: { active: 0 },
    // radio: `color-radio-${ui._id}`,
    kids: [
      Skeletons.Note({
        className: `${fig} text`,
        content: content,
      }),
      discountItem,
    ],
  });
}

function billing_header(ui) {
  const fig = `${ui.fig.family}-billing__header`;

  return Skeletons.Box.X({
    className: `${fig} main`,
    // sys_pn: "billing-header",
    debug: __filename,
    kids: [item(ui, "Monthly"), item(ui, "Yearly", 15), item(ui, "Checkout")],
  });
}

export default billing_header;
