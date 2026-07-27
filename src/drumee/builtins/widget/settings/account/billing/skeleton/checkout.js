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
  // ORG bootstrap: a payer still on the default domain has no organisation
  // yet — collect the org name + subdomain BEFORE Stripe Checkout (the
  // webhook provisions the org after payment). Team AND Business are both
  // org plans, so either needs it. Members of an existing org domain never
  // see this (move-semantics membership).
  const needsOrgBootstrap =
    /^(team|business)$/.test(selectedPlan) && ~~Visitor.get("domain_id") <= 1;
  const orgSection = needsOrgBootstrap
    ? Skeletons.Box.Y({
        className: `${pfx}-section ${pfx}-org-section`,
        kids: [
          Skeletons.Note({
            className: `${pfx}-section-title`,
            content: LOCALE.ORG_URL_TITLE,
          }),
          entry(ui, {
            label: LOCALE.ORG_NAME_LABEL,
            name: "org_name",
            type: "text",
            placeholder: LOCALE.ORG_NAME_LABEL,
            // Auto organization name ("<user> Team") — editable; the submit
            // path falls back to the same default if the field is cleared.
            value: String(ui.state?.checkout?.orgName || ui._defaultOrgName() || ""),
            sys_pn: `${pfx}-org-name-input`,
            interactive: 1,
          }),
          Skeletons.Box.X({
            className: `${pfx}-org-ident-row`,
            kids: [
              entry(ui, {
                label: LOCALE.ORG_SUBDOMAIN_LABEL,
                name: "org_ident",
                type: "text",
                placeholder: LOCALE.ORG_SUBDOMAIN_LABEL,
                // Auto subdomain suggestion (slugged username) — editable;
                // availability is still checked by validate_org_ident.
                value: String(ui.state?.checkout?.orgIdent || ui._defaultOrgIdent() || ""),
                sys_pn: `${pfx}-org-ident-input`,
                interactive: 1,
              }),
              Skeletons.Note({
                className: `${pfx}-org-ident-suffix`,
                content: `.${bootstrap().main_domain}`,
              }),
            ],
          }),
          Skeletons.Note({
            className: `${pfx}-org-ident-hint`,
            content: LOCALE.ORG_URL_HINT,
          }),
        ],
      })
    : null;
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
            { content: LOCALE.TEAM, state: selectedPlan === "team" ? 1 : 0, service: "select-checkout-plan", value: "team", radio: `checkout-plan-${ui._id}` },
            { content: LOCALE.BUSINESS, state: selectedPlan === "business" ? 1 : 0, service: "select-checkout-plan", value: "business", radio: `checkout-plan-${ui._id}` },
          ]),
        ],
      }),

      ...(orgSection ? [orgSection] : []),

      Skeletons.Box.Y({
        className: `${pfx}-section`,
        kids: [
          Skeletons.Note({
            className: `${pfx}-section-title`,
            content: LOCALE.BILLING_CYCLE,
          }),
          pillBar(ui, [
            { content: LOCALE.MONTHLY, state: billingCycle === "monthly" ? 1 : 0, service: "select-billing-cycle", value: "monthly", radio: `checkout-billing-cycle-${ui._id}` },
            { content: `${LOCALE.YEARLY} - `, discount: LOCALE.ONE_MONTH_FREE, state: billingCycle === "yearly" ? 1 : 0, service: "select-billing-cycle", value: "yearly", radio: `checkout-billing-cycle-${ui._id}` },
          ]),
        ],
      }),

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
