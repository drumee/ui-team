const { button } = require("builtins/skeleton/toolkit");
/**
 * 
 * @param {*} ui 
 * @param {*} opt 
 * @param {*} cycle 
 * @returns 
 */
function item(ui, title, description) {
  const fig = `${ui.fig.family}-seats`;


  return Skeletons.Box.X({
    className: `${fig}-item`,
    kids: [
      Skeletons.Note({
        className: `${fig}-title`,
        content: title,
      }),
      Skeletons.Note({
        className: `${fig}-description`,
        content: description,
      }),
    ],
  });

}

export default function (ui) {
  const pfx = `${ui.fig.family}-seats`;

  if (Visitor.get('domain_id') == 1) {
    { return { kind: "organization_form", uiHandler: [ui] } }
  }
  const { available_seat, total_seat } = Visitor.quota()
  return Skeletons.Box.Y({
    className: `${pfx}__main`,
    kids: [
      item(ui, "Seats URL", Visitor.get('domain')),
      item(ui, "Total seat", total_seat),
      item(ui, "Available seats", available_seat),
      button(ui, {
        label: "Manage seats",
        className: `${pfx}__button`,
        service: "manage-seats",
        state: 1,
        priority: "primary",
        // radio: `checkout-plan-${ui._id}`,
        // value: "free",
      })
    ]
  })
}
