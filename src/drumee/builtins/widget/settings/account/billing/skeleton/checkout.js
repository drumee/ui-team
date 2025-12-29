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
  // Read state directly from ui.state.checkout.selectedBundle to ensure we get the latest value
  // IMPORTANT: Always read from ui.state directly, not from any cached value
  const selectedBundle = String(ui.state?.checkout?.selectedBundle || "");
  const bundleValue = String(value || "");
  // Only this item is selected if its value matches the selected bundle
  // If selectedBundle is empty string, no item is selected
  const isSelected = selectedBundle !== "" && selectedBundle === bundleValue;

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

  // Parse price: "$8 /mo" -> amount: "$8", period: "/mo"
  const priceMatch = String(price || "").match(/^(.+?)\s*(\/mo)$/);
  const priceAmount = priceMatch ? priceMatch[1] : price; // "$8"
  const pricePeriod = priceMatch ? priceMatch[2] : ""; // "/mo"

  return Skeletons.Box.X({
    className: `${pfx}-bundle-item`,
    radio: `checkout-bundle-${ui._id}`,
    service: "select-bundle",
    value: value,
    state: isSelected ? 1 : 0,
    bubble: false,
    uiHandler: [ui],
    radioRecursive: true, // Ensure child elements (bundle-radio) also update when parent state changes
    kids: [
      Skeletons.Box.X({
        className: `${pfx}-bundle-radio`,
        state: isSelected ? 1 : 0,
      }),
      Skeletons.Box.Y({
        className: `${pfx}-bundle-content`,
        kids: [
          titleContent,
          Skeletons.Box.X({
            className: `${pfx}-bundle-price`,
            kids: [
              Skeletons.Note({
                className: `${pfx}-bundle-price-amount`,
                content: priceAmount,
              }),
              pricePeriod ? Skeletons.Note({
                className: `${pfx}-bundle-price-period`,
                content: pricePeriod,
              }) : null,
            ].filter(Boolean),
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
            content: LOCALE.CURRENT_PLAN,
          }),
          Skeletons.Box.X({
            className: `${pfx}-plan-buttons`,
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
                label: LOCALE.PRO,
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
            label: LOCALE.NUMBER_OF_SEATS,
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
            label: LOCALE.ADDITIONAL_STORAGE_GB,
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
            content: LOCALE.BILLING_CYCLE,
          }),
          Skeletons.Box.X({
            className: `${pfx}-billing-buttons`,
            kids: [
              button(ui, {
                label: LOCALE.MONTHLY,
                className: `${pfx}-billing-button`,
                service: "select-billing-cycle",
                priority: "secondary",
                state: ui.state?.checkout?.billingCycle === "monthly" ? 1 : 0,
                radio: `checkout-billing-cycle-${ui._id}`,
                value: "monthly",
              }),
              button(ui, {
                label: LOCALE.YEARLY_DISCOUNT,
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
                content: LOCALE.STORAGE_BUNDLES,
              }),
            ],
          }),
          Skeletons.Note({
            className: `${pfx}-bundles-subtitle`,
            ico: "hard-drive",
            content: LOCALE.STORAGE_ADD_ON,
          }),
          Skeletons.Note({
            className: `${pfx}-bundles-note`,
            content: LOCALE.CHOOSE_ONE_STORAGE_UPGRADE,
          }),
          Skeletons.Box.Y({
            className: `${pfx}-bundles-list`,
            kids: [
              Skeletons.Box.X({
                className: `${pfx}-bundles-item`,
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
                ],
              }),
              Skeletons.Box.X({
                className: `${pfx}-bundles-item`,
                kids: [
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
                    badge: LOCALE.BEST_VALUE,
                  }),
                ],
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
        content: LOCALE.TOTAL_OUTCOME,
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
                content: LOCALE.BASE_PRICE,
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
                content: LOCALE.INCLUDED_SEATS,
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
                content: LOCALE.TOTAL_STORAGE,
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
                content: LOCALE.EFFECTIVE_PRICE_PER_SEAT,
              }),
              Skeletons.Note({
                className: `${pfx}-breakdown-value`,
                content: "$3.40",
              }),
            ],
          }),
        ],
      }),
      Skeletons.Button.Label({
        label: LOCALE.PROCEED_TO_CHECKOUT,
        className: `${pfx}-checkout-button`,
        ico: "cart",
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
