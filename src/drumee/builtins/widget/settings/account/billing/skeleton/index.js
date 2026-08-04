/**
 * Get content based on current tab
 * Tab 2 (checkout): return checkout layout
 * Other tabs: return plans layout with footer
 * @param {Object} ui - UI instance
 * @returns {Object} Skeletons component
 */
function getContent(ui) {
  const fig = ui.fig.family;
  const tab = ui.state?.currentTab ?? ui.tab ?? 0;
  
  if (tab === 2) {
    return require("./checkout").default(ui);
  } else {
    const cycle = ui.state?.plansTab?.cycle ?? (tab === 0 ? "monthly" : "yearly");
    const plans = require("./plans").default(ui, cycle);
    const footer = require("./footer").default(ui);
    
    return Skeletons.Box.Y({
      className: `${fig}__content-wrapper`,
      kids: [
        plans,
        footer,
      ],
    });
  }
}

/**
 * Popup top bar: title + close. Rendered when settings_billing is mounted as
 * a popup over the Settings page (settings_main overlay). The close button
 * bubbles "billing-close" up to the host, which clears the overlay.
 * @param {Object} ui - UI instance
 * @returns {Object} Skeletons component
 */
function popupHeader(ui) {
  const fig = ui.fig.family;
  return Skeletons.Box.X({
    className: `${fig}__popup-header`,
    kids: [
      Skeletons.Note({
        className: `${fig}__popup-title`,
        content: LOCALE.BILLING_SUBSCRIPTION,
      }),
      Skeletons.Button.Svg({
        className: `${fig}__popup-close`,
        ico: "cross",
        service: "billing-close",
        uiHandler: [ui],
        bubble: false,
      }),
    ],
  });
}

/**
 * Full-page title header (Figma design): a big "Billing & Subscription" page
 * title, rendered when settings_billing is mounted full-page in the desk
 * settings-main-slot (opt.page). No close button — the page is left via the
 * breadcrumb/sidebar like the Settings and Admin Console pages.
 * @param {Object} ui - UI instance
 * @returns {Object} Skeletons component
 */
function pageHeader(ui) {
  const fig = ui.fig.family;
  return Skeletons.Note({
    className: `${fig}__page-title`,
    content: LOCALE.BILLING_SUBSCRIPTION,
  });
}

/**
 * Subscription status banner — the single cancel-aware surface on the billing
 * page. Shown only when the caller has a paid subscription (ui._hasPaidSub):
 *  - pending cancel (ui._isCanceling): "ends on {date}, access kept" + Resume.
 *  - active: "renews on {date}" + Cancel plan.
 * A hard-cancelled sub has no mirror row → no banner (workspace on Free).
 * @param {Object} ui - UI instance
 * @returns {Object|null} Skeletons component
 */
function subscriptionBanner(ui) {
  // _hasPaidSub is filled asynchronously by _loadSubscription(); waiting for
  // it left the banner (current plan + Cancel) invisible for the whole first
  // round-trip. The synchronous quota plan already tells us the caller pays —
  // render the banner from the very first paint and let the renew date fill
  // in once the mirror lands (ticket 2026-07-22).
  const quotaPlan = String(((Visitor.quota && Visitor.quota()) || {}).plan || "").toLowerCase();
  // Decides only whether the banner APPEARS. Whether it carries a Cancel
  // action is a separate question (_hasCancellablePlan, below) — holding a
  // paid tier and holding a cancellable subscription are not the same thing.
  const paidByQuota = ui._isPaidByQuota ? ui._isPaidByQuota() : /^(pro|team|enterprise)$/.test(quotaPlan);
  if (!ui._hasPaidSub && !paidByQuota) return null;
  const fig = `${ui.fig.family}__sub-banner`;
  const when = ui._periodEnd ? Dayjs(ui._periodEnd * 1000).format("MMM D, YYYY") : "";
  const planLabel = quotaPlan ? quotaPlan.charAt(0).toUpperCase() + quotaPlan.slice(1) : "";

  if (ui._isCanceling) {
    return Skeletons.Box.X({
      className: `${fig} ${fig}--canceling`,
      kids: [
        Skeletons.Box.Y({
          className: `${fig}-text`,
          kids: [
            Skeletons.Note({
              className: `${fig}-title`,
              content: (LOCALE.SUBSCRIPTION_ENDS_ON || "Your plan ends on {0}").format(when),
            }),
            Skeletons.Note({
              className: `${fig}-desc`,
              content: LOCALE.SUBSCRIPTION_ENDS_DESC || "You keep full access until then, after which your workspace returns to the Free plan.",
            }),
          ],
        }),
        Skeletons.Note({
          className: `${fig}-action ${fig}-resume`,
          content: LOCALE.RESUME_SUBSCRIPTION || "Resume plan",
          service: "resume-subscription",
          uiHandler: [ui],
          bubble: false,
        }),
      ].filter(Boolean),
    });
  }

  // LAUNCH30 free trial — no Stripe renew. Banner names the trial end date
  // and Cancel ends it immediately via promo.cancel (not cancel_subscription).
  if (ui._isPromoTrial) {
    return Skeletons.Box.X({
      className: `${fig} ${fig}--active ${fig}--promo`,
      kids: [
        Skeletons.Note({
          className: `${fig}-title`,
          content: when
            ? (LOCALE.PROMO_TRIAL_ENDS_ON || "Your free trial ends on {0}").format(when)
            : (LOCALE.CURRENT_PLAN_BANNER || "You are on the {0} plan").format(planLabel),
        }),
        Skeletons.Note({
          className: `${fig}-action ${fig}-cancel`,
          content: LOCALE.PROMO_CANCEL_CONFIRM || LOCALE.CANCEL_PLAN || "End trial",
          service: "cancel-subscription",
          uiHandler: [ui],
          bubble: false,
        }),
      ].filter(Boolean),
    });
  }

  return Skeletons.Box.X({
    className: `${fig} ${fig}--active`,
    kids: [
      Skeletons.Note({
        className: `${fig}-title`,
        // Renew date comes from the async mirror; until it lands, announce
        // the current plan instead of rendering an empty date.
        //
        // 'trialing' is a DEFERRED CYCLE SWITCH left over from when the
        // switch was routed through Checkout with a trial_end — not a product
        // trial. Cycle changes are charged at checkout now, so nothing new
        // lands in this state, but subscriptions already in it must still read
        // "starts on": saying "renews on" for a plan that has not started read
        // as a bug (tester 2026-07-30).
        content: when
          ? ((ui._subscription && ui._subscription.status === "trialing")
            ? (LOCALE.CYCLE_STARTS_ON || "Your {0} billing starts on {1}")
              .format(/^year/.test(String(ui._subscription.period || "")) ? (LOCALE.YEARLY || "Yearly") : (LOCALE.MONTHLY || "Monthly"), when)
            : (LOCALE.SUBSCRIPTION_RENEWS_ON || "Your subscription renews on {0}").format(when))
          : (LOCALE.CURRENT_PLAN_BANNER || "You are on the {0} plan").format(planLabel),
      }),
      // Only offer Cancel when something can actually be cancelled. The
      // banner itself renders off the QUOTA so it appears on first paint,
      // before the subscription mirror lands — but a quota is not a
      // subscription. A hand-granted plan, and one whose subscription has
      // already been terminated (the entitlement is kept until period_end,
      // the mirror row is not), both read as paid with nothing behind them,
      // and cancel_subscription answers NO_SUBSCRIPTION. Offering the button
      // there turned a plan the user cannot cancel into "Something went
      // wrong" (reported on preview, lexis@drumee.org).
      ui._hasCancellablePlan && ui._hasCancellablePlan()
        ? Skeletons.Note({
          className: `${fig}-action ${fig}-cancel`,
          content: LOCALE.CANCEL_PLAN || "Cancel plan",
          service: "cancel-subscription",
          uiHandler: [ui],
          bubble: false,
        })
        : null,
    ].filter(Boolean),
  });
}

/**
 * LAUNCH30 persistent reminder (design doc 2026-07-30, tester feedback
 * 2026-07-31 #3: "don't spam the popup — a small pill lives here instead").
 * Floating card, top-right of the page (design mockup) — NOT an in-flow
 * banner, so it never shifts the plan cards below it. Shown once the full
 * offer modal has been seen on ANY surface but the account still hasn't
 * claimed and the campaign is still live — get_state's "eligible_seen".
 * ui._promoState is the SAME answer Desk._maybeShowPromoLaunch30 already
 * fetched on this page's mount (see billing/index.js onDomRefresh) — no
 * extra round trip. "Claim now" re-opens Modal A directly (a deliberate
 * re-entry, not the automatic first-time show). The close X only hides the
 * card for this page view (ui._promoPillDismissed, a local render flag) —
 * the offer itself already lives here until claimed or the campaign ends
 * (design doc's own "recovered state" note), so dismissing the card is not
 * another server-tracked "seen" surface.
 * @param {Object} ui - UI instance
 * @returns {Object|null} Skeletons component
 */
function claimPill(ui) {
  const promo = ui._promoState;
  if (!promo || promo.state !== "eligible_seen" || ui._promoPillDismissed) return null;
  const fig = `${ui.fig.family}__promo-pill`;
  const endDate = promo.campaign_ends_at
    ? Dayjs.unix(promo.campaign_ends_at).format("MMM D, YYYY")
    : "";
  return Skeletons.Box.Z({
    className: fig,
    kids: [
      Skeletons.Button.Svg({
        className: `${fig}-close`,
        ico: "cross",
        service: "promo-pill-dismiss",
        uiHandler: [ui],
      }),
      Skeletons.Box.X({
        className: `${fig}-row`,
        kids: [
          Skeletons.Box.Y({
            className: `${fig}-text`,
            kids: [
              Skeletons.Note({
                className: `${fig}-title`,
                content: LOCALE.PROMO_PILL_TITLE || "Your free month of Team is still yours to claim.",
              }),
              endDate
                ? Skeletons.Note({
                    className: `${fig}-sub`,
                    content: (LOCALE.PROMO_OFFER_ENDS || "Ends {0}.").format(endDate),
                  })
                : null,
            ].filter(Boolean),
          }),
          Skeletons.Note({
            className: `${fig}-cta`,
            content: LOCALE.PROMO_PILL_CTA || "Claim now",
            service: "promo-pill-claim",
            uiHandler: [ui],
            bubble: false,
          }),
        ],
      }),
    ],
  });
}

/**
 * Create main billing layout with header tabs and content container. Renders a
 * full-page title (opt.page), a popup shell (opt.popup), or headerless (the
 * settings_account tab).
 * @param {Object} ui - UI instance
 * @returns {Object} Skeletons component
 */
/**
 * "Have a partner code?" — redeem a free-period MKT code straight into a
 * plan, without going through Stripe Checkout (promo.redeem).
 *
 * Only shown to someone who could actually use it: still on Free, and not
 * already inside another organisation's domain (the server refuses that
 * with ALREADY_IN_OTHER_DOMAIN, so offering the box there is a dead end).
 * A paying customer sees nothing — their code, if they have one, is a
 * discount and belongs on the checkout tab.
 *
 * The plan is the SHOPPER's choice: a coupon says where it may be spent
 * (plan_scope), never which plan to hand out. A code locked to one plan
 * still rejects the other, server-side.
 * @param {Object} ui - UI instance
 * @returns {Object|null} Skeletons component
 */
function redeemBox(ui) {
  // Same gate as the plan cards: _mayCheckout() carries the SERVER's verdict
  // on whether this caller may start a purchase, which is the population
  // promo.redeem accepts too — a Free user with no org, or the owner of one.
  // A plain `domain_id > 1` test would be stricter than the service and hide
  // the box from an owner whose grant has lapsed back to Free.
  const paying = ui._hasActiveSub || (ui._isPaidByQuota && ui._isPaidByQuota());
  const fig = `${ui.fig.family}__redeem`;
  const st = (ui.state && ui.state.redeem) || {};

  // A successful redeem trips the paying gate, so returning null here would
  // swallow the only place the free period's end date is shown. Keep the
  // confirmation; drop the form.
  if (!ui._mayCheckout() || paying) {
    return st.success
      ? Skeletons.Box.Y({
        className: `${fig} is-done`,
        kids: [Skeletons.Note({ className: `${fig}-success`, content: st.success })],
      })
      : null;
  }

  const plan = st.plan || "team";
  const busy = !!st.busy;
  // Collapsed by default: most people arriving at Billing are here to pick a
  // plan, not to enter a code, and a permanently open form pushed the plan
  // cards down the page for all of them. One line until it is wanted.
  const open = !!st.open;

  const toggleRow = Skeletons.Box.X({
    className: `${fig}-toggle${open ? " is-open" : ""}`,
    service: "redeem-toggle",
    uiHandler: [ui],
    bubble: false,
    kidsOpt: { active: 0 },
    kids: [
      Skeletons.Note({
        className: `${fig}-title`,
        content: LOCALE.REDEEM_CODE_TITLE || "Have a partner code?",
      }),
      Skeletons.Note({
        className: `${fig}-toggle-hint`,
        content: open
          ? (LOCALE.CLOSE || "Close")
          : (LOCALE.REDEEM_CODE_CTA || "Redeem"),
      }),
    ],
  });

  // Success is the one thing worth keeping visible after collapsing — the
  // plan changed, and hiding the confirmation with the form would leave the
  // page looking like nothing happened.
  if (!open) {
    return Skeletons.Box.Y({
      className: `${fig} is-collapsed`,
      kids: [
        toggleRow,
        st.success
          ? Skeletons.Note({ className: `${fig}-success`, content: st.success })
          : null,
      ].filter(Boolean),
    });
  }

  const planPill = (code, label) =>
    Skeletons.Box.X({
      className: `${fig}-pill-item`,
      state: plan === code ? 1 : 0,
      kidsOpt: { active: 0 },
      radio: `redeem-plan-${ui._id}`,
      service: "redeem-select-plan",
      value: code,
      bubble: false,
      uiHandler: [ui],
      kids: [Skeletons.Note({ className: `${fig}-pill-text`, content: label })],
    });

  return Skeletons.Box.Y({
    className: `${fig} is-open`,
    kids: [
      toggleRow,
      Skeletons.Note({
        className: `${fig}-sub`,
        content: LOCALE.REDEEM_CODE_SUB
          || "Redeem it to start your plan — no card required.",
      }),
      Skeletons.Box.X({
        className: `${fig}-pill-bar`,
        kids: [
          planPill("pro", LOCALE.PRO || "Pro"),
          planPill("team", LOCALE.TEAM || "Team"),
          planPill("business", LOCALE.BUSINESS || "Business"),
        ],
      }),
      Skeletons.Box.X({
        className: `${fig}-row`,
        kids: [
          Skeletons.Entry({
            className: `${fig}-input`,
            name: "redeem_code",
            // Not PROMO_CODE_PLACEHOLDER — that one reads "(optional)", true on
            // Checkout where a code is a discount on a purchase. Here the code
            // IS the transaction, so it is required.
            placeholder: LOCALE.REDEEM_CODE_PLACEHOLDER || "Enter partner code",
            value: st.code || "",
            sys_pn: `${fig}-code-input`,
            partHandler: [ui],
            uiHandler: [ui],
            interactive: busy ? 0 : 1,
            // NO `state` prop. ui-core maps option names onto behaviors
            // (addons/backbone/view/behavior.js: `state → behavior/toggle`),
            // so passing state:0 makes the field a TOGGLE: the first
            // keystroke runs onAlsoClick → mould() → reload(), which does
            // `el.innerHTML = ''` and rebuilds the <input>. Focus dies with
            // the old node, so typing "T_FREE2M" left just "T".
          }),
          Skeletons.Note({
            className: `${fig}-cta${busy ? " is-busy" : ""}`,
            content: busy
              ? (LOCALE.REDEEM_CODE_WORKING || "Redeeming…")
              : (LOCALE.REDEEM_CODE_CTA || "Redeem"),
            service: busy ? null : "redeem-code",
            uiHandler: [ui],
            bubble: false,
          }),
        ],
      }),
      st.error
        ? Skeletons.Note({ className: `${fig}-error`, content: st.error })
        : null,
      st.success
        ? Skeletons.Note({ className: `${fig}-success`, content: st.success })
        : null,
    ].filter(Boolean),
  });
}

function billing(ui) {
  const fig = ui.fig.family;
  const header = require("./header").default(ui);
  const content = getContent(ui);

  const contentWrapper = Skeletons.Box.Y({
    className: `${fig}__content-container`,
    sys_pn: `${fig}__content`,
    kids: [content],
  });

  const body = Skeletons.Box.Y({
    className: `${fig}__body`,
    kids: [
      ui._page ? pageHeader(ui) : null,
      header,
      subscriptionBanner(ui),
      claimPill(ui),
      redeemBox(ui),
      contentWrapper,
    ].filter(Boolean),
  });

  return Skeletons.Box.Y({
    className: `${fig}__main`,
    kids: [
      ui._popup ? popupHeader(ui) : null,
      body,
    ].filter(Boolean),
  });
}

export default billing;
export { getContent };
