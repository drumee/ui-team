const { entry } = require("../../../../../skeleton/toolkit");

/**
 * Segmented-pill selector (Figma 2769-279246): a grey track holding one or
 * more equal-width segments; the active segment is a solid filled pill. Same
 * visual pattern as the plans-header cycle tabs — used here for "Current
 * plan" (Free/Pro/Team) and "Billing Cycle" (Monthly/Yearly) so the checkout
 * form matches the rest of the billing page instead of the old bordered-card
 * selector.
 * @param {Object} ui - UI instance
 * @param {Array<Object>} segments - { content, discount, state, service, value, radio }
 * @returns {Object} Skeletons component
 */
function pillBar(ui, segments) {
  const pfx = `${ui.fig.family}__checkout-pill`;
  return Skeletons.Box.X({
    className: `${pfx}-bar`,
    kids: segments.map((seg) => {
      const kids = [Skeletons.Note({ className: `${pfx}-text`, content: seg.content })];
      if (seg.discount) {
        kids.push(Skeletons.Note({ className: `${pfx}-discount`, content: seg.discount }));
      }
      return Skeletons.Box.X({
        className: `${pfx}-item`,
        state: seg.state,
        kidsOpt: { active: 0 },
        radio: seg.radio,
        service: seg.service,
        value: seg.value,
        bubble: false,
        uiHandler: [ui],
        kids,
      });
    }),
  });
}

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
  const isFreePlan = ui.state?.checkout?.selectedPlan === "free";

  const titleContent = badge
    ? Skeletons.Box.X({
      className: `${pfx}-bundle-header`,
      active: 0,
      kids: [
        Skeletons.Note({
          className: `${pfx}-bundle-title`,
          content: title,
          active: 0,
        }),
        Skeletons.Note({
          className: `${pfx}-bundle-badge`,
          content: badge,
          active: 0,
        }),
      ],
    })
    : Skeletons.Note({
      className: `${pfx}-bundle-title`,
      content: title,
      active: 0,
    });

  const priceMatch = String(price || "").match(/^(.+?)\s*(\/mo)$/);
  const priceAmount = priceMatch ? priceMatch[1] : price;
  const pricePeriod = priceMatch ? priceMatch[2] : "";

  return Skeletons.Box.X({
    className: `${pfx}-bundle-item`,
    radio: `checkout-bundle-${ui._id}`,
    service: "select-bundle",
    name: "select-bundle",
    value: value,
    formItem: 1,
    state: isSelected ? 1 : 0,
    active: isFreePlan ? 0 : 1,
    bubble: false,
    uiHandler: [ui],
    radioRecursive: true,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}-bundle-radio`,
        state: isSelected ? 1 : 0,
        active: 0
      }),
      Skeletons.Box.Y({
        className: `${pfx}-bundle-content`,
        active: 0,
        kids: [
          titleContent,
          Skeletons.Box.X({
            className: `${pfx}-bundle-price`,
            active: 0,
            kids: [
              Skeletons.Note({
                className: `${pfx}-bundle-price-amount`,
                content: priceAmount,
                active: 0,
              }),
              pricePeriod
                ? Skeletons.Note({
                  className: `${pfx}-bundle-price-period`,
                  content: pricePeriod,
                  active: 0,
                })
                : null,
            ].filter(Boolean),
          }),
          Skeletons.Note({
            className: `${pfx}-bundle-unit`,
            content: unit,
            active: 0,
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

  const summary = ui.calculateCheckoutSummary();

  const isFreePlan = ui.state?.checkout?.selectedPlan === "free";
  let { seats, selectedPlan, storage, billingCycle } = summary
  let min, max;
  if (seats > 1) {
    min = 5;
    max = 1000;
  }
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
          pillBar(ui, [
            { content: LOCALE.FREE, state: selectedPlan === "free" ? 1 : 0, service: "select-checkout-plan", value: "free", radio: `checkout-plan-${ui._id}` },
            { content: LOCALE.PRO, state: selectedPlan === "pro" ? 1 : 0, service: "select-checkout-plan", value: "pro", radio: `checkout-plan-${ui._id}` },
            { content: LOCALE.TEAM, state: selectedPlan === "team" ? 1 : 0, service: "select-checkout-plan", value: "team", radio: `checkout-plan-${ui._id}` },
          ]),
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
            value: String(seats || 0),
            // watch: "seats-changes",
            sys_pn: `${pfx}-seats-input`,
            service: "input-seats",
            readonly: selectedPlan === "free" ? true : false,
            interactive: selectedPlan === "free" ? 0 : 1,
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
            type: "text",
            placeholder: "0",
            readonly: 1,
            value: String(storage || 0),
            sys_pn: `${pfx}-storage-input`,
            interactive: selectedPlan === "free" ? 0 : 1,
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
          pillBar(ui, [
            { content: LOCALE.MONTHLY, state: billingCycle === "monthly" ? 1 : 0, service: "select-billing-cycle", value: "monthly", radio: `checkout-billing-cycle-${ui._id}` },
            { content: `${LOCALE.YEARLY} - `, discount: `${LOCALE.SAVED} 15%`, state: billingCycle === "yearly" ? 1 : 0, service: "select-billing-cycle", value: "yearly", radio: `checkout-billing-cycle-${ui._id}` },
          ]),
        ],
      }),

      // Only show storage bundles section if plan is not "free"
      ...(isFreePlan ? [] : [
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
            // Only bundles that exist in the catalog (storage_100/500/1000 —
            // there is no storage_200 backend row); prices are catalog-driven.
            Skeletons.Box.Y({
              className: `${pfx}-section-bundles-list`,
              kids: [
                Skeletons.Box.X({
                  className: `${pfx}-section-bundles-list-item`,
                  kids: [
                    bundleItem(ui, {
                      value: "100",
                      title: "+100GB",
                      price: `${ui._money(ui._catPrice("storage_100", "month"))} /mo`,
                      unit: `$${(ui._catPrice("storage_100", "month") / 100).toFixed(3)}/GB`,
                    }),
                    bundleItem(ui, {
                      value: "500",
                      title: "+500GB",
                      price: `${ui._money(ui._catPrice("storage_500", "month"))} /mo`,
                      unit: `$${(ui._catPrice("storage_500", "month") / 500).toFixed(3)}/GB`,
                    }),
                  ],
                }),
                Skeletons.Box.X({
                  className: `${pfx}-section-bundles-list-item`,
                  kids: [
                    bundleItem(ui, {
                      value: "1000",
                      title: "+1TB",
                      price: `${ui._money(ui._catPrice("storage_1000", "month"))} /mo`,
                      unit: `$${(ui._catPrice("storage_1000", "month") / 1000).toFixed(3)}/GB`,
                      badge: LOCALE.BEST_VALUE,
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ]),
    ],
  });

  const rightPanel = Skeletons.Box.Y({
    className: `${pfx}-right`,
    sys_pn: `${pfx}-right-panel`,
    partHandler: [ui],
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
        service: isFreePlan ? null : "proceed-checkout-billing",
        priority: "primary",
        uiHandler: [ui],
        bubble: false,
        state: isFreePlan ? 0 : 1,
        dataset: isFreePlan ? { disabled: 1 } : undefined,
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
  const summary = ui.calculateCheckoutSummary();
  const isFreePlan = ui.state?.checkout?.selectedPlan === "free";

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
        service: isFreePlan ? null : "proceed-checkout-billing",
        priority: "primary",
        uiHandler: [ui],
        bubble: false,
        state: isFreePlan ? 0 : 1,
        dataset: isFreePlan ? { disabled: 1 } : undefined,
      }),
    ],
  });
}

export default checkout;
export { rightPanelContent };
