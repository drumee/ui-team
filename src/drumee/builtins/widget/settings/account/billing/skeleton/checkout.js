const { button, entry } = require("../../../../../skeleton/toolkit");

/**
 * Create bundle item component for storage upgrade options
 * Display title, price, unit and badge (if available)
 * @param {Object} ui - UI instance
 * @param {Object} opt - Options: value, title, price, unit, badge
 * @returns {Object} Skeletons component
 */
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
              pricePeriod
                ? Skeletons.Note({
                    className: `${pfx}-bundle-price-period`,
                    content: pricePeriod,
                  })
                : null,
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
 * Create checkout layout with left panel (form) and right panel (summary)
 * Left panel: plan selection, seats, storage, billing cycle, storage bundles
 * Right panel: total price, breakdown, checkout button
 * @param {Object} ui - UI instance
 * @returns {Object} Skeletons component
 */
function checkout(ui) {
  const fig = `${ui.fig.family}__checkout`;
  const pfx = fig;

  const summary = ui.calculateCheckoutSummary(ui.state);

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
            ico: "raw-number-seat",
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
            ico: "raw-hard-drive",
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
            className: `${pfx}-billing-cycle-buttons`,
            kids: [
              button(ui, {
                label: LOCALE.MONTHLY,
                className: `${pfx}-billing-cycle-button`,
                service: "select-billing-cycle",
                priority: "secondary",
                state: ui.state?.checkout?.billingCycle === "monthly" ? 1 : 0,
                radio: `checkout-billing-cycle-${ui._id}`,
                value: "monthly",
              }),
              Skeletons.Box.X({
                className: `${pfx}-billing-cycle-button-main`,
                state: ui.state?.checkout?.billingCycle === "yearly" ? 1 : 0,
                service: "select-billing-cycle",
                uiHandler: [ui],
                radio: `checkout-billing-cycle-${ui._id}`,
                value: "yearly",
                kids: [
                  Skeletons.Note({
                    className: `${pfx}-billing-cycle-button-main-title`,
                    content: LOCALE.YEARLY,
                    active: 0,
                  }),

                  Skeletons.Note({
                    className: `${pfx}-billing-cycle-button-main-title-discount`,
                    content: `-15%`,
                    active: 0,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),

      Skeletons.Box.Y({
        className: `${pfx}-section-bundles`,
        kids: [
          Skeletons.Box.X({
            className: `${pfx}-section-bundles-header`,
            kids: [
              Skeletons.Note({
                className: `${pfx}-section-bundles-header-title`,
                content: LOCALE.STORAGE_BUNDLES,
              }),
            ],
          }),
          Skeletons.Box.X({
            className: `${pfx}-section-bundles-subtitle`,
            kids: [
              Skeletons.Button.Icon({
                className: `${pfx}-section-bundles-icon`,
                ico: "raw-hard-drive-blue",
              }),
              Skeletons.Note({
                className: `${pfx}-section-bundles-subtitle`,
                content: LOCALE.STORAGE_ADD_ON,
              }),
            ],
          }),
          Skeletons.Note({
            className: `${pfx}-section-bundles-note`,
            content: LOCALE.CHOOSE_ONE_STORAGE_UPGRADE,
          }),
          Skeletons.Box.Y({
            className: `${pfx}-section-bundles-list`,
            kids: [
              Skeletons.Box.X({
                className: `${pfx}-section-bundles-list-item`,
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
                className: `${pfx}-section-bundles-list-item`,
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
      Skeletons.Box.X({
        className: `${pfx}-total-price`,
        kids: [
          Skeletons.Note({
            className: `${pfx}-total-price-amount`,
            content: summary.totalPrice,
          }),
          Skeletons.Note({
            className: `${pfx}-total-price-period`,
            content: `/${summary.period}`,
          }),
        ],
      }),

      Skeletons.Box.X({
        className: `${pfx}-breakdown`,
      }),

      Skeletons.Box.Y({
        className: `${pfx}-breakdown-items`,
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
        ],
      }),

      Skeletons.Box.X({
        className: `${pfx}-breakdown`,
      }),

      Skeletons.Box.Y({
        kids: [
          Skeletons.Box.X({
            className: `${pfx}-breakdown-item ${pfx}-breakdown-total-storage`,
            kids: [
              Skeletons.Button.Icon({
                className: `${pfx}-breakdown-icon`,
                ico: "raw-hard-drive-green",
              }),
              Skeletons.Note({
                className: `${pfx}-breakdown-total-storage-label`,
                content: LOCALE.TOTAL_STORAGE,
              }),
              Skeletons.Note({
                className: `${pfx}-breakdown-total-storage-value`,
                content: summary.totalStorage,
              }),
            ],
          }),
        ],
      }),

      Skeletons.Box.X({
        className: `${pfx}-breakdown`,
      }),

      Skeletons.Box.Y({
        kids: [
          Skeletons.Box.X({
            className: `${pfx}-breakdown-item ${pfx}-breakdown-items ${pfx}-breakdown-effective-price-per-seat `,
            kids: [
              Skeletons.Button.Icon({
                className: `${pfx}-breakdown-icon`,
                ico: "raw-trending-up",
              }),
              Skeletons.Box.Y({
                className: `${pfx}-breakdown-label-container`,
                kids: [
                  Skeletons.Note({
                    className: `${pfx}-breakdown-label`,
                    content: LOCALE.EFFECTIVE_PRICE_PER_SEAT,
                  }),
                  Skeletons.Note({
                    className: `${pfx}-breakdown-value-effective-price-per-seat`,
                    content: summary.effectivePricePerSeat,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      Skeletons.Button.Label({
        label: LOCALE.PROCEED_TO_CHECKOUT,
        className: `${pfx}-checkout-button`,
        ico: "raw-cart",
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
 * Create right panel content (checkout summary) for dynamic updates
 * Display total price, breakdown items, and checkout button
 * @param {Object} ui - UI instance
 * @returns {Object} Skeletons component
 */
function rightPanelContent(ui) {
  const fig = `${ui.fig.family}__checkout`;
  const pfx = fig;
  const summary = ui.calculateCheckoutSummary(ui.state);

  return Skeletons.Box.Y({
    className: `${pfx}-right`,
    sys_pn: `${pfx}-right-panel`,
    kids: [
      Skeletons.Note({
        className: `${pfx}-total-label`,
        content: LOCALE.TOTAL_OUTCOME,
      }),
      Skeletons.Box.X({
        className: `${pfx}-total-price`,
        kids: [
          Skeletons.Note({
            className: `${pfx}-total-price-amount`,
            content: summary.totalPrice,
          }),
          Skeletons.Note({
            className: `${pfx}-total-price-period`,
            content: `/${summary.period}`,
          }),
        ],
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
            className: `${pfx}-breakdown-item ${pfx}-breakdown-total-storage`,
            kids: [
              Skeletons.Button.Icon({
                className: `${pfx}-breakdown-icon`,
                ico: "raw-hard-drive-green",
              }),
              Skeletons.Note({
                className: `${pfx}-breakdown-total-storage-label`,
                content: LOCALE.TOTAL_STORAGE,
              }),
              Skeletons.Note({
                className: `${pfx}-breakdown-total-storage-value`,
                content: summary.totalStorage,
              }),
            ],
          }),
          Skeletons.Box.X({
            className: `${pfx}-breakdown-item ${pfx}-breakdown-items ${pfx}-breakdown-effective-price-per-seat`,
            kids: [
              Skeletons.Button.Icon({
                className: `${pfx}-breakdown-icon`,
                ico: "raw-trending-up",
              }),
              Skeletons.Box.Y({
                className: `${pfx}-breakdown-label-container`,
                kids: [
                  Skeletons.Note({
                    className: `${pfx}-breakdown-label`,
                    content: LOCALE.EFFECTIVE_PRICE_PER_SEAT,
                  }),
                  Skeletons.Note({
                    className: `${pfx}-breakdown-value-effective-price-per-seat`,
                    content: summary.effectivePricePerSeat,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      Skeletons.Button.Label({
        label: LOCALE.PROCEED_TO_CHECKOUT,
        className: `${pfx}-checkout-button`,
        ico: "raw-cart",
        service: "proceed-checkout-billing",
        priority: "primary",
        uiHandler: [ui],
        bubble: false,
      }),
    ],
  });
}

export default checkout;
export { rightPanelContent };
