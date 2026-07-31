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
  // Shared with the "Cancel plan" click guard (_isPaidByQuota) so the button
  // is never rendered clickable without also being armed.
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
        // 'trialing' here is a DEFERRED CYCLE SWITCH, not a product trial:
        // the new cycle's subscription idles (Stripe trial) until the old
        // cycle's paid time lapses, and period_end is the day it starts
        // billing. Saying "renews on" for a plan that has not started read
        // as a bug (tester 2026-07-30).
        content: when
          ? ((ui._subscription && ui._subscription.status === "trialing")
            ? (LOCALE.CYCLE_STARTS_ON || "Your {0} billing starts on {1}")
              .format(/^year/.test(String(ui._subscription.period || "")) ? (LOCALE.YEARLY || "Yearly") : (LOCALE.MONTHLY || "Monthly"), when)
            : (LOCALE.SUBSCRIPTION_RENEWS_ON || "Your subscription renews on {0}").format(when))
          : (LOCALE.CURRENT_PLAN_BANNER || "You are on the {0} plan").format(planLabel),
      }),
      Skeletons.Note({
        className: `${fig}-action ${fig}-cancel`,
        content: LOCALE.CANCEL_PLAN || "Cancel plan",
        service: "cancel-subscription",
        uiHandler: [ui],
        bubble: false,
      }),
    ].filter(Boolean),
  });
}

/**
 * Create main billing layout with header tabs and content container. Renders a
 * full-page title (opt.page), a popup shell (opt.popup), or headerless (the
 * settings_account tab).
 * @param {Object} ui - UI instance
 * @returns {Object} Skeletons component
 */
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
