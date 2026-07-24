const { button } = require("../../../../../skeleton/toolkit");
const { canUpgradePlan } = require("libs/billing");

/**
 * Build the plan catalogue for display. Text comes from LOCALE; prices come
 * from the server catalog (Stripe truth) via ui._catPrice, so nothing here is
 * hardcoded. Rebuilt per render so a language switch is reflected immediately.
 *
 * Layout follows Figma 3050-96140: each card has a tinted price-header box
 * (title + optional "Start from" label + big amount + period, or a plain
 * "Contact sales" text), a full-width pill CTA, a sub-text line, then the
 * feature list. The Pro card carries the "Popular" badge on its header box.
 * @param {Object} ui - UI instance
 * @param {string} cycle - "monthly" | "yearly"
 * @returns {Object} keyed plan options
 */
function getOptions(ui, cycle = "monthly") {
  const isYear = cycle === "yearly";
  const money = (n) => ui._money(n);
  const period = isYear ? "year" : "month";
  // Team is the only self-serve tier, so it is the only one with a Stripe
  // price to read. Business and Sovereign are sales-led: their amounts are
  // published figures, shown so the ladder reads as a ladder, with a
  // "Contact sales" CTA instead of checkout — hence the literal fallbacks.
  const teamPrice = money(ui._catPrice("team", period));
  const businessPrice = money(
    ui._catPrice("business", period) ?? (isYear ? 1089 : 99),
  );
  const sovereignPrice = money(isYear ? 5489 : 499);

  const perMonth = LOCALE.PER_MONTH;
  const perYear = LOCALE.PER_YEAR;
  const per = isYear ? perYear : perMonth;

  return {
    free: {
      title: LOCALE.FREE,
      priceAmount: money(0),
      pricePeriod: perMonth,
      buttonTitle: LOCALE.CTA_START_FREE,
      buttonKind: "secondary",
      subText: LOCALE.PLAN_FREE_DESC,
      features: [
        { main: "5 GB", sub: LOCALE.FEAT_STORAGE },
        { main: "1", sub: LOCALE.FEAT_MEMBER_SOLO },
        { main: "1", sub: LOCALE.FEAT_WORKSPACE },
        { main: "", sub: LOCALE.FEAT_FILES_CHAT },
        { main: LOCALE.SUPPORT_COMMUNITY, sub: LOCALE.FEAT_SUPPORT },
      ],
    },
    // The entry paid tier, and the only one that reaches Stripe Checkout.
    team: {
      title: LOCALE.TEAM,
      priceAmount: teamPrice,
      pricePeriod: per,
      buttonTitle: LOCALE.CTA_START_WORKSPACE,
      buttonKind: "primary",
      badge: 1,
      subText: LOCALE.PLAN_TEAM_DESC,
      features: [
        { main: "100 GB", sub: LOCALE.FEAT_STORAGE },
        { main: LOCALE.UP_TO_10, sub: LOCALE.FEAT_MEMBERS },
        { main: "1", sub: LOCALE.FEAT_WORKSPACE },
        { main: LOCALE.GRANULAR, sub: LOCALE.FEAT_PERMISSIONS_ROLES },
        { main: "30", sub: LOCALE.FEAT_DAYS_VERSION_HISTORY },
        { main: "", sub: LOCALE.FEAT_FILES_CHAT },
        { main: "", sub: LOCALE.FEAT_GUEST_ACCESS },
        { main: "", sub: LOCALE.FEAT_ADMIN_PANEL },
        { main: LOCALE.SUPPORT_EMAIL, sub: LOCALE.FEAT_SUPPORT },
      ],
    },
    business: {
      title: LOCALE.BUSINESS,
      priceAmount: businessPrice,
      pricePeriod: per,
      buttonTitle: LOCALE.CTA_TALK_TO_SALES,
      buttonKind: "dark",
      subText: LOCALE.PLAN_BUSINESS_DESC,
      features: [
        { main: "1 TB", sub: LOCALE.FEAT_STORAGE },
        { main: LOCALE.UNLIMITED, sub: LOCALE.FEAT_MEMBERS },
        { main: LOCALE.MULTIPLE, sub: LOCALE.FEAT_WORKSPACES },
        { main: LOCALE.GRANULAR_AUDIT, sub: LOCALE.FEAT_PERMISSIONS },
        { main: LOCALE.ONE_YEAR, sub: LOCALE.FEAT_VERSION_HISTORY },
        { main: "", sub: LOCALE.FEAT_FILES_CHAT },
        { main: "", sub: LOCALE.FEAT_GUEST_ACCESS },
        { main: "", sub: LOCALE.FEAT_ADMIN_PANEL_AUDIT },
        { main: "", sub: LOCALE.FEAT_API_SSO },
        { main: LOCALE.SUPPORT_PRIORITY_SLA, sub: LOCALE.FEAT_SUPPORT },
      ],
    },
    sovereign: {
      title: LOCALE.SOVEREIGN,
      priceLabel: LOCALE.START_FROM,
      priceAmount: sovereignPrice,
      pricePeriod: per,
      buttonTitle: LOCALE.CTA_GET_SOVEREIGN_NODE,
      buttonKind: "dark",
      subText: LOCALE.PLAN_SOVEREIGN_DESC,
      features: [
        { main: "", sub: LOCALE.FEAT_SELF_HOSTED },
        { main: LOCALE.YOUR_INFRASTRUCTURE, sub: LOCALE.FEAT_STORAGE },
        { main: LOCALE.UNLIMITED, sub: LOCALE.FEAT_MEMBERS },
        { main: LOCALE.FULL_OS, sub: LOCALE.FEAT_WORKSPACES },
        { main: LOCALE.FULL_ACL, sub: LOCALE.FEAT_PERMISSIONS },
        { main: LOCALE.UNLIMITED, sub: LOCALE.FEAT_VERSION_HISTORY },
        { main: "", sub: LOCALE.FEAT_FILES_CHAT },
        { main: "", sub: LOCALE.FEAT_GUEST_ACCESS },
        { main: "", sub: LOCALE.FEAT_ADMIN_PANEL_SDK },
        { main: "", sub: LOCALE.FEAT_API_SSO_SDK },
        { main: LOCALE.SUPPORT_DEDICATED_SLA, sub: LOCALE.FEAT_SUPPORT },
        { main: LOCALE.ZERO_TRUST, sub: LOCALE.FEAT_DATA_CONTROL },
      ],
    },
  };
}

/**
 * The "Popular" highlight is an upsell cue aimed at users below Team. Once the
 * user sits on a higher tier the Team card must not carry the active/focused
 * look — only the current plan's card does. The badge chip itself stays; only
 * the tinted/primary styling is suppressed.
 * @param {Object} ui - UI instance
 * @param {number} badge - the option's badge flag
 * @returns {boolean} whether the popular styling applies
 */
function popularHighlight(ui, badge) {
  return !!badge && !/^(business|sovereign|enterprise)$/i.test(ui.currentPlanName || "");
}

/**
 * Price-header box: tinted rounded panel holding the plan name, price (label +
 * amount + period) or a plain "Contact sales" line, and the Popular badge.
 * @param {Object} ui - UI instance
 * @param {string} fig - BEM prefix
 * @param {Object} option - plan option
 * @returns {Object} Skeletons component
 */
function priceHeader(ui, fig, option, isCurrent) {
  const { title, priceLabel, priceAmount, pricePeriod, priceText, badge } = option;

  const priceKids = [];
  if (priceLabel) {
    priceKids.push(
      Skeletons.Note({ className: `${fig}-price-label`, content: priceLabel }),
    );
  }
  if (priceAmount) {
    priceKids.push(
      Skeletons.Box.X({
        className: `${fig}-price-row`,
        kids: [
          Skeletons.Note({ className: `${fig}-price-amount`, content: priceAmount }),
          pricePeriod
            ? Skeletons.Note({ className: `${fig}-price-period`, content: pricePeriod })
            : null,
        ].filter(Boolean),
      }),
    );
  } else if (priceText) {
    priceKids.push(
      Skeletons.Note({ className: `${fig}-price-text`, content: priceText }),
    );
  }

  const badgeEl = badge
    ? Skeletons.Box.X({
        className: `${fig}-badge`,
        kids: [
          Skeletons.Image.Svg({ ico: "crown", className: `${fig}-badge-icon` }),
          Skeletons.Note({ content: LOCALE.POPULAR }),
        ],
      })
    : null;

  return Skeletons.Box.Y({
    // The CURRENT plan's card is the focused/active one — it takes the
    // primary-tinted header (and border, see -item.current) even when it
    // isn't the "Popular" card.
    className: `${fig}-header ${popularHighlight(ui, badge) ? "popular" : ""} ${isCurrent ? "current" : ""}`,
    kids: [
      Skeletons.Note({ className: `${fig}-title`, content: title }),
      Skeletons.Box.Y({ className: `${fig}-price`, kids: priceKids }),
      badgeEl,
    ].filter(Boolean),
  });
}

/**
 * Create plan item component (Free, Team, Business, Sovereign): price-header
 * box → pill CTA → sub-text → feature list. Follows Figma 3050-96140.
 * @param {Object} ui - UI instance
 * @param {string} opt - Plan option key (free, team, business, sovereign)
 * @param {Object} option - Pre-built option object from getOptions
 * @returns {Object} Skeletons component
 */
function item(ui, opt, option) {
  const { buttonTitle, buttonKind, subText, features, badge } = option;
  const fig = `${ui.fig.family}__plan`;
  // Mark the caller's active plan: pill-style "Your current plan" instead of a
  // CTA (design: the Free card shows the pill while the user is on Free).
  const isCurrent = (ui.currentPlanName || "free") === opt;

  // Billing is owner-managed: inside an org (domain_id > 1) only the OWNER may
  // change the plan. Without this the CTA looked live for every member and only
  // failed at the very last step, where payment.checkout answers
  // ORG_IDENT_REQUIRED (they own no org) or ALREADY_IN_OTHER_DOMAIN (they
  // cannot bootstrap a second one) — a raw status code after a full checkout
  // walk. Same rule as the sidebar entry, from the same helper, so the two can
  // never disagree.
  const locked = !isCurrent && !canUpgradePlan();

  let buttonBtn;
  if (isCurrent) {
    // Flat pill (no button() helper — a single element, so there's no
    // outer/inner split to keep in sync). "-main" matches the family the
    // button() helper's outer box uses below, so both share one CSS block.
    buttonBtn = Skeletons.Box.X({
      className: `${fig}-button-main current`,
      dataset: { disabled: 1 },
      kids: [
        Skeletons.Note({
          className: `${fig}-current-label`,
          content: LOCALE.YOUR_CURRENT_PLAN,
        }),
      ],
    });
  } else if (locked) {
    // Same flat pill as the current-plan marker, carrying the reason instead of
    // an action — the ladder stays readable, it just isn't actionable here.
    buttonBtn = Skeletons.Box.X({
      className: `${fig}-button-main locked`,
      dataset: { disabled: 1 },
      kids: [
        Skeletons.Note({
          className: `${fig}-current-label`,
          content: LOCALE.ONLY_OWNER_CAN_CHANGE_PLAN,
        }),
      ],
    });
  } else {
    // The button() toolkit helper renders an OUTER full-width clickable box
    // (className `${pfx}-main ${priority}`) wrapping an INNER text span
    // (className `${pfx} btn`) — two elements, not one. Passing buttonKind
    // embedded in className (`${fig}-button ${buttonKind}`) broke this: pfx
    // itself became a two-token string, so appending "-main" landed after
    // the LAST token ("...button dark" + "-main" = "...button dark-main"),
    // never producing the outer's intended "${fig}-button-main" class. The
    // outer ended up matching only `priority`'s class, always "secondary"
    // for non-primary kinds — a full-width grey box with the real (dark)
    // colour only on the inner, text-width span. Keep className to the bare
    // base class and let `priority` carry buttonKind directly so BOTH the
    // outer (`-main` + priority) and inner (bare pfx + priority, still
    // embedded via pfx here) resolve to real, matching selectors.
    buttonBtn = button(ui, {
      label: buttonTitle,
      className: `${fig}-button`,
      service: "select-plan-button",
      value: opt,
      name: opt,
      formItem: 1,
      priority: buttonKind,
      uiHandler: [ui],
    });
  }

  const subTextItem = subText
    ? Skeletons.Note({ className: `${fig}-subtext`, content: subText })
    : null;

  const featureItems = features.map((f) => {
    const feature = typeof f === "string" ? { main: f, sub: "" } : f;
    const { main, sub } = feature;

    return Skeletons.Box.X({
      className: `${fig}-feature`,
      kids: [
        Skeletons.Image.Svg({ ico: "available", className: `${fig}-feature-icon` }),
        Skeletons.Box.X({
          className: `${fig}-feature-text`,
          kids: [
            main
              ? Skeletons.Note({ className: `${fig}-feature-main`, content: main })
              : null,
            sub
              ? Skeletons.Note({ className: `${fig}-feature-sub`, content: sub })
              : null,
          ].filter(Boolean),
        }),
      ],
    });
  });

  const featuresWrapper = Skeletons.Box.Y({
    className: `${fig}-features`,
    kids: featureItems,
  });

  return Skeletons.Box.Y({
    className: `${fig}-item ${popularHighlight(ui, badge) ? "popular" : ""} ${isCurrent ? "current" : ""}`,
    kids: [
      priceHeader(ui, fig, option, isCurrent),
      buttonBtn,
      subTextItem,
      featuresWrapper,
    ].filter(Boolean),
  });
}

/**
 * Create plans content layout with 4 plan items (Free, Team, Business,
 * Sovereign). Only Team reaches Stripe Checkout; Business and Sovereign are
 * sales-led and their CTA opens the contact-sales notice instead.
 * @param {Object} ui - UI instance
 * @param {string} cycle - Billing cycle (monthly or yearly)
 * @returns {Object} Skeletons component
 */
function billing_content(ui, cycle = "monthly") {
  const fig = `${ui.fig.family}__plans`;
  const options = getOptions(ui, cycle);

  return Skeletons.Box.G({
    className: `${fig}-main`,
    kids: [
      item(ui, "free", options.free),
      item(ui, "team", options.team),
      item(ui, "business", options.business),
      item(ui, "sovereign", options.sovereign),
    ],
  });
}

export default billing_content;
