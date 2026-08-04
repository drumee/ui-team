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
            { content: LOCALE.PRO, state: selectedPlan === "pro" ? 1 : 0, service: "select-checkout-plan", value: "pro", radio: `checkout-plan-${ui._id}` },
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
            { content: `${LOCALE.YEARLY} - `, discount: LOCALE.TWO_MONTHS_FREE || "2 months free", state: billingCycle === "yearly" ? 1 : 0, service: "select-billing-cycle", value: "yearly", radio: `checkout-billing-cycle-${ui._id}` },
          ]),
        ],
      }),

    ],
  });

  // Single source of truth for the summary column. This used to be a second,
  // hand-maintained copy of rightPanelContent(): the promo work landed only in
  // that function, so a FULL re-render (switching billing cycle, re-entering the
  // tab) painted a summary with the discounted total but none of the lines that
  // explain it — no struck-through original, no "Promo (N% off)" row, no
  // "then <full price>" note. The shopper saw a reduced price with nothing
  // saying it was temporary. One function now serves both the first paint and
  // every incremental update, so the two cannot drift again — rightPanel()
  // wraps it in the root here, _updateRightPanelContent feeds the kids alone.
  const rightPanelTree = rightPanel(ui);

  return Skeletons.Box.X({
    className: `${pfx}-main`,
    kids: [leftPanel, rightPanelTree],
  });
}

/**
 * Optional MKT outreach partner code (Iris/Theo…). Preview via Apply
 * (payment.preview_coupon) updates the summary price; the real reserve
 * still happens on Proceed to Checkout — not the LAUNCH30 free-month flow.
 */
function promoCodeSection(ui) {
  const fig = `${ui.fig.family}__checkout`;
  const pfx = fig;
  const checkout = ui.state?.checkout || {};
  const promo = checkout.promo || null;
  const promoError = checkout.promoError || "";
  const applied = !!(promo && promo.code);

  // Label sits ABOVE the row. Putting it inside entry() next to Apply made
  // the button flex-end against the whole (label+input) block and look
  // vertically off — Apply/Remove must line up with the field only.
  return Skeletons.Box.Y({
    className: `${pfx}-promo`,
    kids: [
      Skeletons.Note({
        className: `${pfx}-promo-label`,
        content: LOCALE.PROMO_CODE_LABEL || "Promo code",
      }),
      Skeletons.Box.X({
        className: `${pfx}-promo-row`,
        kids: [
          Skeletons.Entry({
            className: `${pfx}-promo-input`,
            name: "promo_code",
            formItem: "promo_code",
            type: "text",
            placeholder: LOCALE.PROMO_CODE_PLACEHOLDER || "Enter partner code",
            value: checkout.promoCode || "",
            sys_pn: `${pfx}-promo-code-input`,
            partHandler: [ui],
            uiHandler: [ui],
            interactive: applied ? 0 : 1,
            readonly: applied ? 1 : 0,
            mode: applied ? _a.commit : _a.interactive,
            service: _a.input,
            // NO `state` prop — see the redeem field in skeleton/index.js:
            // ui-core turns a `state` option into behavior/toggle, whose
            // onAlsoClick calls mould() → reload() → `el.innerHTML = ''` on
            // the first keystroke, so the field kept only its first letter.
          }),
          Skeletons.Note({
            className: `${pfx}-promo-apply${applied ? " is-applied" : ""}`,
            content: applied
              ? (LOCALE.REMOVE || "Remove")
              : (LOCALE.APPLY || "Apply"),
            service: applied ? "remove-promo-code" : "apply-promo-code",
            uiHandler: [ui],
            bubble: false,
          }),
        ],
      }),
      promoError
        ? Skeletons.Note({
            className: `${pfx}-promo-error`,
            content: promoError,
          })
        : null,
      applied
        ? Skeletons.Note({
            className: `${pfx}-promo-applied`,
            content: (LOCALE.PROMO_CODE_APPLIED || "Code {0} applied").format(
              promo.code,
            ),
          })
        : null,
    ].filter(Boolean),
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

  const promo = summary.promo || null;
  const hasDiscount = !!(summary.discountAmount);
  const trialDays = promo ? (parseInt(promo.trial_days, 10) || 0) : 0;

  // How long the % actually lasts. Stripe only ever gets 'once' or
  // 'repeating' from _ensureStripeCoupon, so a percent discount ALWAYS
  // ends — showing the reduced figure as the plain total read as the new
  // forever-price. Counted in PAYMENTS, not months: duration_months is a
  // month count, so on yearly billing a 3-month coupon covers just the
  // first invoice, and "first 3 months" would be wrong on that cycle.
  const discountMonths = promo ? (parseInt(promo.duration_months, 10) || 0) : 0;
  const discountedCycles = summary.period === "year"
    ? Math.max(1, Math.floor(discountMonths / 12))
    : Math.max(1, discountMonths);

  return [
      Skeletons.Note({
        className: `${pfx}-total-label`,
        content: LOCALE.TOTAL_OUTCOME,
      }),
      Skeletons.Box.X({
        className: `${pfx}-total-price${hasDiscount ? " has-promo" : ""}`,
        kids: [
          hasDiscount
            ? Skeletons.Note({
                className: `${pfx}-total-price-original`,
                content: summary.originalPrice,
              })
            : null,
          Skeletons.Note({
            className: `${pfx}-total-price-amount`,
            content: summary.totalPrice,
          }),
          Skeletons.Note({
            className: `${pfx}-total-price-period`,
            content: `/${summary.period}`,
          }),
        ].filter(Boolean),
      }),
      trialDays > 0
        ? Skeletons.Note({
            className: `${pfx}-promo-trial-note`,
            content: (LOCALE.PROMO_CODE_TRIAL_NOTE
              || "{0} days free, then {1}/{2}").format(
              String(trialDays),
              summary.totalPrice,
              summary.period,
            ),
          })
        : null,
      // When the discount ends the price goes back up. Saying so is the
      // difference between an honest quote and one the first full invoice
      // contradicts.
      hasDiscount
        ? Skeletons.Note({
            className: `${pfx}-promo-after-note`,
            content: discountedCycles > 1
              ? (LOCALE.PROMO_CODE_AFTER_N
                || "{0}% off your first {1} payments, then {2}/{3}").format(
                String(promo.percent_off || 0),
                String(discountedCycles),
                summary.basePrice,
                summary.period,
              )
              : (LOCALE.PROMO_CODE_AFTER_ONCE
                || "{0}% off your first payment, then {1}/{2}").format(
                String(promo.percent_off || 0),
                summary.basePrice,
                summary.period,
              ),
          })
        : null,
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
          hasDiscount
            ? Skeletons.Box.X({
                className: `${pfx}-breakdown-item ${pfx}-breakdown-discount`,
                kids: [
                  Skeletons.Note({
                    className: `${pfx}-breakdown-label`,
                    content: (LOCALE.PROMO_CODE_DISCOUNT
                      || "Promo ({0}% off)").format(
                      String(promo.percent_off || 0),
                    ),
                  }),
                  Skeletons.Note({
                    className: `${pfx}-breakdown-value`,
                    content: `−${summary.discountAmount}`,
                  }),
                ],
              })
            : null,
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
          // Dropped for unlimited-member plans — see the left panel.
          summary.effectivePricePerSeat ? Skeletons.Box.X({
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
          }) : null,
        ].filter(Boolean),
      }),
      promoCodeSection(ui),
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
    ].filter(Boolean);
}

/**
 * The panel itself: the root Box plus its content.
 *
 * Kept separate from rightPanelContent() on purpose. _updateRightPanelContent
 * feeds the panel INTO ITSELF — feed() replaces a part's children, so handing
 * it a root carrying `className: -right` / `sys_pn: -right-panel` produced a
 * second panel nested in the first, with 24px of padding stacked on 24px. The
 * visible symptom was the right column narrowing (480 → 405) the moment a
 * promo code was applied, since the inner copy sizes to its content.
 *
 * So: checkout() renders rightPanel() once; every incremental update feeds
 * rightPanelContent(), which is the children ALONE.
 */
function rightPanel(ui) {
  const pfx = `${ui.fig.family}__checkout`;
  return Skeletons.Box.Y({
    className: `${pfx}-right`,
    sys_pn: `${pfx}-right-panel`,
    // onPartReady is what caches __rightPanel for the incremental updates.
    partHandler: [ui],
    kids: rightPanelContent(ui),
  });
}

export default checkout;
export { rightPanel, rightPanelContent, promoCodeSection };
