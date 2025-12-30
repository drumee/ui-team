const { button, entry } = require("../../../../../skeleton/toolkit");

function bundleItem(ui, opt) {
  const { value, title, price, unit, badge } = opt;
  const pfx = `${ui.fig.family}__checkout`;
  const selectedBundle = String(ui.state?.checkout?.selectedBundle || "");
  const bundleValue = String(value || "");
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

  const priceMatch = String(price || "").match(/^(.+?)\s*(\/mo)$/);
  const priceAmount = priceMatch ? priceMatch[1] : price;
  const pricePeriod = priceMatch ? priceMatch[2] : "";

  return Skeletons.Box.X({
    className: `${pfx}-bundle-item`,
    radio: `checkout-bundle-${ui._id}`,
    service: "select-bundle",
    value: value,
    state: isSelected ? 1 : 0,
    bubble: false,
    uiHandler: [ui],
    radioRecursive: true,
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
 * 
 * @param {*} state 
 * @returns 
 */
function calculateCheckoutSummary(state) {
  const checkout = state?.checkout || {};
  const selectedPlan = checkout.selectedPlan || "pro";
  const seats = parseInt(checkout.seats) || 5;
  const storage = parseInt(checkout.storage) || 0;
  const billingCycle = checkout.billingCycle || "monthly";
  const selectedBundle = checkout.selectedBundle;

  const planPrices = {
    free: { monthly: 0, yearly: 0 },
    pro: { monthly: 16.99, yearly: 169.90 }
  };

  const bundlePrices = {
    "100": 8,
    "200": 14,
    "500": 30,
    "1000": 50
  };

  const basePrice = planPrices[selectedPlan]?.[billingCycle] || 0;
  const period = billingCycle === "yearly" ? "year" : "month";

  const bundlePrice = selectedBundle ? (bundlePrices[selectedBundle] || 0) : 0;
  const bundleStorage = selectedBundle ? parseInt(selectedBundle) : 0;

  const baseStorage = selectedPlan === "pro" ? 50 : 5;
  const totalStorage = baseStorage + bundleStorage + storage;

  const totalPrice = billingCycle === "yearly"
    ? (basePrice + (bundlePrice * 12))
    : (basePrice + bundlePrice);

  const effectivePricePerSeat = seats > 0 ? (totalPrice / seats) : 0;

  const formatCurrency = (amount) => {
    return `$${amount.toFixed(2)}`;
  };

  return {
    basePrice: formatCurrency(basePrice),
    bundlePrice: formatCurrency(bundlePrice),
    totalPrice: formatCurrency(totalPrice),
    period: period,
    seats: seats.toString(),
    totalStorage: `${totalStorage} GB`,
    effectivePricePerSeat: formatCurrency(effectivePricePerSeat),
    selectedPlan,
    billingCycle
  };
}

/**
 * 
 * @param {*} ui 
 * @returns 
 */
function checkout(ui) {
  const fig = `${ui.fig.family}__checkout`;
  const pfx = fig;

  const summary = calculateCheckoutSummary(ui.state);

  const leftPanel = Skeletons.Box.Y({
    className: `${pfx}-left`,
    kids: [
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
            value: String(ui.state?.checkout?.seats || 5),
            sys_pn: `${pfx}-seats-input`,
          }),
        ],
      }),

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
            value: String(ui.state?.checkout?.storage || 0),
            sys_pn: `${pfx}-storage-input`,
          }),
        ],
      }),

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
          Skeletons.Box.X({
            className: `${pfx}-bundles-header`,
            kids: [
              Skeletons.Button.Icon({
                className: `${pfx}-bundles-icon`,
                ico: "hard-drive",
              }),
              Skeletons.Note({
                className: `${pfx}-bundles-subtitle`,
                content: LOCALE.STORAGE_ADD_ON,
              }),
            ],
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

  const rightPanel = Skeletons.Box.Y({
    className: `${pfx}-right`,
    sys_pn: `${pfx}-right-panel`,
    kids: [
      Skeletons.Note({
        className: `${pfx}-total-label`,
        content: LOCALE.TOTAL_OUTCOME,
      }),
      Skeletons.Note({
        className: `${pfx}-total-price`,
        content: `${summary.totalPrice} /${summary.period}`,
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
                content: summary.basePrice,
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
                content: summary.seats,
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
                content: summary.totalStorage,
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
                content: summary.effectivePricePerSeat,
              }),
            ],
          }),
        ],
      }),
      Skeletons.Button.Label({
        label: LOCALE.PROCEED_TO_CHECKOUT,
        className: `${pfx}-checkout-button`,
        ico: "cart",
        service: "proceed-checkout-billing",
        priority: "primary",
        uiHandler: [ui],
        bubble: false,
      }),
    ],
  });

  return Skeletons.Box.X({
    className: `${pfx}-main`,
    kids: [leftPanel, rightPanel],
  });
}

/**
 * 
 * @param {*} ui 
 * @returns 
 */
function rightPanelContent(ui) {
  const summary = calculateCheckoutSummary(ui.state);
  const pfx = `${ui.fig.family}__checkout`;
  return Skeletons.Box.Y({
    className: `${pfx}-right`,
    kids: [
      Skeletons.Note({
        className: `${pfx}-total-label`,
        content: LOCALE.TOTAL_OUTCOME,
      }),
      Skeletons.Note({
        className: `${pfx}-total-price`,
        content: `${summary.totalPrice} /${summary.period}`,
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
                content: summary.basePrice,
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
                content: summary.seats,
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
                content: summary.totalStorage,
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
                content: summary.effectivePricePerSeat,
              }),
            ],
          }),
        ],
      }),
      Skeletons.Button.Label({
        label: LOCALE.PROCEED_TO_CHECKOUT,
        className: `${pfx}-checkout-button`,
        ico: "cart",
        service: "proceed-checkout-billing",
        priority: "primary",
        uiHandler: [this],
        bubble: false,
      }),
    ],
  });
}
export default checkout;
export { rightPanelContent, calculateCheckoutSummary };
