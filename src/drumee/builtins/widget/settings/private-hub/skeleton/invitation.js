const { button, entry } = require("builtins/skeleton/toolkit");


/**
 * Time validity section with radio buttons for Unlimited and Set Limit
 */
export default function (ui) {
  const pfx = `${ui.fig.family}-invitation`;
  Skeletons.Box.Y({
    className: `${pfx}-container`,
    kids: [
      entry(ui, {
        label: LOCALE.NUMBER_OF_SEATS,
        name: "seats",
        ico: "raw-number-seat",
        icoPosition: "left",
        type: "number",
        placeholder: "Enter email to invite. Ex. alice@bob.org",
        sys_pn: `invitation`,
        interactive: 1,
      }),
      Skeletons.Box.X({
        className: `${pfx}-buttons`,
        kids: [
          button(ui, {
            label: LOCALE.FREE,
            className: `${pfx}-plan-button`,
            service: "select-checkout-plan",
            priority: "secondary",
            state: ui.state?.checkout?.selectedPlan === "free" ? 1 : 0,
            radio: `checkout-plan-${ui._id}`,
            value: "free",
          }),
          button(ui, {
            label: LOCALE.TEAM,
            className: `${pfx}-plan-button`,
            service: "select-checkout-plan",
            priority: "secondary",
            state: ui.state?.checkout?.selectedPlan === "team" ? 1 : 0,
            radio: `checkout-plan-${ui._id}`,
            value: "team",
          }),
        ],
      })
    ],
  });
}

