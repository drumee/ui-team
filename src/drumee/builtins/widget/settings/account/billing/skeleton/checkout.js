/**
 * Create a bundle item for Storage Add-on
 * @param {*} ui
 * @param {*} opt - { value, title, price, unit, badge }
 * @returns
 */
const { button, entry } = require("../../../../../skeleton/toolkit");

function bundleItem(ui, opt) {
  const { value, title, price, unit, badge } = opt;
  const pfx = `${ui.fig.family}__checkout`;
  // Ensure we get the latest state - convert both to string for comparison
  const selectedBundle = String(ui.state?.checkout?.selectedBundle || "");
  const bundleValue = String(value || "");
  const isSelected = selectedBundle === bundleValue;

  const titleContent = badge
    ? Skeletons.Box.X({
        className: `${pfx}-bundle-header`,
        kids: [
          Skeletons.Note({
            className: `${pfx}-bundle-title`,
            content: title,
          }),
          Skeletons.Note({
            className: `${pfx}-bundle-badge`,
            content: badge,
          }),
        ],
      })
    : Skeletons.Note({
        className: `${pfx}-bundle-title`,
        content: title,
      });

  return Skeletons.Box.X({
    className: `${pfx}-bundle-item`,
    radio: `checkout-bundle-${ui._id}`,
    service: "select-bundle",
    value: value,
    state: isSelected ? 1 : 0,
    bubble: false,
    uiHandler: [ui],
    kids: [
      Skeletons.Box.X({
        className: `${pfx}-bundle-radio`,
        state: isSelected ? 1 : 0,
      }),
      Skeletons.Box.Y({
        className: `${pfx}-bundle-content`,
        kids: [
          titleContent,
          Skeletons.Note({
            className: `${pfx}-bundle-price`,
            content: price,
          }),
          Skeletons.Note({
            className: `${pfx}-bundle-unit`,
            content: unit,
          }),
        ],
      }),
    ],
  });
}

/**
 * Checkout layout with configuration on left and summary on right
 * @param {*} ui
 * @returns
 */
function checkout(ui) {
  const fig = `${ui.fig.family}__checkout`;
  const pfx = fig;

  // Left Panel - Configuration
  const leftPanel = Skeletons.Box.Y({
    className: `${pfx}-left`,
    kids: [
      // Current Plan section
      Skeletons.Box.Y({
        className: `${pfx}-section`,
        kids: [
          Skeletons.Note({
            className: `${pfx}-section-title`,
            content: "Current Plan",
          }),
          Skeletons.Box.X({
            className: `${pfx}-plan-buttons`,
            kids: [
              button(ui, {
                label: "Free",
                className: `${pfx}-plan-button`,
                service: "select-checkout-plan",
                priority: "secondary",
                state: ui.state?.checkout?.selectedPlan === "free" ? 1 : 0,
                radio: `checkout-plan-${ui._id}`,
                value: "free",
              }),
              button(ui, {
                label: "Pro",
                className: `${pfx}-plan-button`,
                service: "select-checkout-plan",
                priority: "secondary",
                state: ui.state?.checkout?.selectedPlan === "pro" ? 1 : 0,
                radio: `checkout-plan-${ui._id}`,
                value: "pro",
              }),
            ],
          }),
        ],
      }),

      // Number of Seats
      Skeletons.Box.Y({
        className: `${pfx}-section`,
        kids: [
          entry(ui, {
            label: "Number of Seats",
            name: "seats",
            ico: "number-seat",
            icoPosition: "left",
            type: "number",
            placeholder: "0",
            value: "0",
          }),
        ],
      }),

      // Additional Storage
      Skeletons.Box.Y({
        className: `${pfx}-section`,
        kids: [
            entry(ui, {
            label: "Additional Storage (GB)",
            name: "storage",
            ico: "hard-drive",
            icoPosition: "left",
            type: "number",
            placeholder: "0",
            value: "0",
          }),
        ],
      }),

      // Billing Cycle
      Skeletons.Box.Y({
        className: `${pfx}-section`,
        kids: [
          Skeletons.Note({
            className: `${pfx}-section-title`,
            content: "Billing Cycle",
          }),
          Skeletons.Box.X({
            className: `${pfx}-billing-buttons`,
            kids: [
              button(ui, {
                label: "Monthly",
                className: `${pfx}-billing-button`,
                service: "select-billing-cycle",
                priority: "secondary",
                state: ui.state?.checkout?.billingCycle === "monthly" ? 1 : 0,
                radio: `checkout-billing-cycle-${ui._id}`,
                value: "monthly",
              }),
              button(ui, {
                label: "Yearly -15%",
                className: `${pfx}-billing-button`,
                service: "select-billing-cycle",
                priority: "secondary",
                state: ui.state?.checkout?.billingCycle === "yearly" ? 1 : 0,
                radio: `checkout-billing-cycle-${ui._id}`,
                value: "yearly",
              }),
            ],
          }),
        ],
      }),

      // Storage Bundles
      Skeletons.Box.Y({
        className: `${pfx}-section`,
        kids: [
          Skeletons.Box.X({
            className: `${pfx}-bundles-header`,
            kids: [
              Skeletons.Note({
                className: `${pfx}-section-title`,
                content: "Storage Bundles",
              }),
            ],
          }),
          Skeletons.Note({
            className: `${pfx}-bundles-subtitle`,
            ico: "hard-drive",
            content: "Storage Add-on",
          }),
          Skeletons.Note({
            className: `${pfx}-bundles-note`,
            content: "Choose one storage upgrade.",
          }),
          Skeletons.Box.Y({
            className: `${pfx}-bundles-list`,
            kids: [
              bundleItem(ui, {
                value: "100",
                title: "+100GB",
                price: "$8 /mo",
                unit: "$0.080/GB",
              }),
              bundleItem(ui, {
                value: "200",
                title: "+200GB",
                price: "$14 /mo",
                unit: "$0.070/GB",
              }),
              bundleItem(ui, {
                value: "500",
                title: "+500GB",
                price: "$30 /mo",
                unit: "$0.060/GB",
              }),
              bundleItem(ui, {
                value: "1000",
                title: "+1TB",
                price: "$50 /mo",
                unit: "$0.049/GB",
                badge: "BEST VALUE",
              }),
            ],
          }),
        ],
      }),
    ],
  });

  // Right Panel - Summary
  const rightPanel = Skeletons.Box.Y({
    className: `${pfx}-right`,
    kids: [
      Skeletons.Note({
        className: `${pfx}-total-label`,
        content: "Total outcome:",
      }),
      Skeletons.Note({
        className: `${pfx}-total-price`,
        content: "$16.99 /month",
      }),
      Skeletons.Box.Y({
        className: `${pfx}-breakdown`,
        kids: [
          Skeletons.Box.X({
            className: `${pfx}-breakdown-item`,
            kids: [
              Skeletons.Note({
                className: `${pfx}-breakdown-label`,
                content: "Base price:",
              }),
              Skeletons.Note({
                className: `${pfx}-breakdown-value`,
                content: "$16.99",
              }),
            ],
          }),
          Skeletons.Box.X({
            className: `${pfx}-breakdown-item`,
            kids: [
              Skeletons.Note({
                className: `${pfx}-breakdown-label`,
                content: "Included seats:",
              }),
              Skeletons.Note({
                className: `${pfx}-breakdown-value`,
                content: "5",
              }),
            ],
          }),
          Skeletons.Box.X({
            className: `${pfx}-breakdown-item`,
            kids: [
              Skeletons.Button.Icon({
                className: `${pfx}-breakdown-icon`,
                ico: "hard-drive",
              }),
              Skeletons.Note({
                className: `${pfx}-breakdown-label`,
                content: "Total Storage:",
              }),
              Skeletons.Note({
                className: `${pfx}-breakdown-value`,
                content: "50 GB",
              }),
            ],
          }),
          Skeletons.Box.X({
            className: `${pfx}-breakdown-item`,
            kids: [
              Skeletons.Button.Icon({
                className: `${pfx}-breakdown-icon`,
                ico: "trending-up",
              }),
              Skeletons.Note({
                className: `${pfx}-breakdown-label`,
                content: "Effective price per seat:",
              }),
              Skeletons.Note({
                className: `${pfx}-breakdown-value`,
                content: "$3.40",
              }),
            ],
          }),
        ],
      }),
      button(ui, {
        label: "Proceed to Checkout",
        ico: "cart",
        className: `${pfx}-checkout-button`,
        service: "proceed-checkout",
        priority: "primary",
      }),
    ],
  });

  return Skeletons.Box.X({
    className: `${pfx}-main`,
    debug: __filename,
    kids: [leftPanel, rightPanel],
  });
}

export default checkout;
