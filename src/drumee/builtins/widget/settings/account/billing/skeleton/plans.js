const { button } = require("../../../../../skeleton/toolkit");

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
  const proPrice = money(ui._catPrice("pro", isYear ? "year" : "month"));
  const teamPrice = money(ui._catPrice("team", isYear ? "year" : "month"));
  // Extra-seat price is the pro_seat catalog row (monthly figure in the card
  // copy, matching the design's "each additional seat $5.00").
  const seatPrice = money(ui._catPrice("pro_seat", "month"));

  const perMonth = LOCALE.PER_MONTH;
  const perYear = LOCALE.PER_YEAR;
  const perSeatMonth = LOCALE.PER_SEAT_MONTH;
  const perSeatYear = LOCALE.PER_SEAT_YEAR;

  return {
    free: {
      title: LOCALE.FREE,
      priceAmount: money(0),
      pricePeriod: perMonth,
      buttonTitle: LOCALE.GET_STARTED,
      buttonKind: "secondary",
      subText: "",
      features: [
        { main: "20 GB", sub: LOCALE.FEAT_STORAGE },
        { main: LOCALE.NONE, sub: LOCALE.FEAT_ADMIN_ROLES },
      ],
    },
    pro: {
      title: LOCALE.PRO,
      priceLabel: LOCALE.START_FROM,
      priceAmount: proPrice,
      pricePeriod: isYear ? perYear : perMonth,
      buttonTitle: LOCALE.UPGRADE,
      buttonKind: "primary",
      badge: 1,
      subText: LOCALE.PLAN_PRO_DESC.format(seatPrice),
      features: [
        // Match yp.plan seed: pro quota.disk = 50e9 (50 GB).
        { main: "50 GB", sub: LOCALE.FEAT_STORAGE },
        { main: "5", sub: LOCALE.FEAT_EDITOR_ACCESS },
        { main: "1", sub: LOCALE.FEAT_ADMIN_ROLE },
        { main: "7", sub: LOCALE.FEAT_DAYS_VERSION_HISTORY },
        { main: "", sub: LOCALE.FEAT_PERMISSIONS_ROLES },
        { main: "", sub: LOCALE.FEAT_GUEST_ACCESS },
      ],
    },
    team: {
      title: LOCALE.TEAM,
      priceAmount: teamPrice,
      pricePeriod: isYear ? perSeatYear : perSeatMonth,
      buttonTitle: LOCALE.CHOOSE_TEAM,
      buttonKind: "dark",
      subText: LOCALE.PLAN_TEAM_DESC,
      features: [
        { main: "50 GB", sub: LOCALE.FEAT_STORAGE_PER_SEAT },
        { main: LOCALE.ORG, sub: LOCALE.FEAT_DOMAIN_WIDE },
        { main: "30", sub: LOCALE.FEAT_DAYS_VERSION_HISTORY },
        { main: "", sub: LOCALE.FEAT_ADMIN_BILLING },
      ],
    },
    enterprise: {
      title: LOCALE.ENTERPRISE,
      priceText: LOCALE.CONTACT_SALES,
      buttonTitle: LOCALE.CONTACT_SALES,
      buttonKind: "dark",
      subText: LOCALE.PLAN_ENTERPRISE_DESC,
      features: [
        { main: LOCALE.CUSTOM, sub: LOCALE.FEAT_STORAGE },
        { main: LOCALE.CUSTOM, sub: LOCALE.FEAT_EDITOR_ACCESS },
        { main: LOCALE.YES, sub: LOCALE.FEAT_ADMIN_ROLE },
        { main: LOCALE.UP_TO_90_DAYS, sub: LOCALE.FEAT_VERSION_HISTORY },
        { main: "", sub: LOCALE.FEAT_PERMISSIONS_ROLES },
        { main: "", sub: LOCALE.FEAT_GUEST_ACCESS },
        { main: "", sub: LOCALE.FEAT_ACTIVITY_LOGS },
      ],
    },
  };
}

/**
 * Price-header box: tinted rounded panel holding the plan name, price (label +
 * amount + period) or a plain "Contact sales" line, and the Popular badge.
 * @param {Object} ui - UI instance
 * @param {string} fig - BEM prefix
 * @param {Object} option - plan option
 * @returns {Object} Skeletons component
 */
function priceHeader(ui, fig, option) {
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
    className: `${fig}-header ${badge ? "popular" : ""}`,
    kids: [
      Skeletons.Note({ className: `${fig}-title`, content: title }),
      Skeletons.Box.Y({ className: `${fig}-price`, kids: priceKids }),
      badgeEl,
    ].filter(Boolean),
  });
}

/**
 * Create plan item component (Free, Pro, Team, Enterprise): price-header box →
 * pill CTA → sub-text → feature list. Follows Figma 3050-96140.
 * @param {Object} ui - UI instance
 * @param {string} opt - Plan option key (free, pro, team, enterprise)
 * @param {Object} option - Pre-built option object from getOptions
 * @returns {Object} Skeletons component
 */
function item(ui, opt, option) {
  const { buttonKind, subText, features, badge } = option;
  let { buttonTitle } = option;
  const fig = `${ui.fig.family}__plan`;
  // Mark the caller's active plan: pill-style "Your current plan" instead of a
  // CTA (design: the Free card shows the pill while the user is on Free).
  const isCurrent = (ui.currentPlanName || "free") === opt;

  // Paid subscriber CTAs: Free → cancel at period end; other paid plans →
  // Billing Portal (upgrade/change). Avoid implying a second Checkout.
  if (!isCurrent && ui._hasPaidSub) {
    if (opt === "free") {
      buttonTitle = LOCALE.CANCEL_PLAN || "Cancel plan";
    } else if (opt === "pro" || opt === "team") {
      buttonTitle = LOCALE.MANAGE_SUBSCRIPTION || LOCALE.UPGRADE || buttonTitle;
    }
  }

  let buttonBtn;
  if (isCurrent) {
    buttonBtn = Skeletons.Box.X({
      className: `${fig}-button current`,
      dataset: { disabled: 1 },
      kids: [
        Skeletons.Note({
          className: `${fig}-current-label`,
          content: LOCALE.YOUR_CURRENT_PLAN,
        }),
      ],
    });
  } else {
    buttonBtn = button(ui, {
      label: buttonTitle,
      className: `${fig}-button ${buttonKind}`,
      service: "select-plan-button",
      value: opt,
      name: opt,
      formItem: 1,
      priority: buttonKind === "primary" ? "primary" : "secondary",
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
    className: `${fig}-item ${badge ? "popular" : ""}`,
    kids: [
      priceHeader(ui, fig, option),
      buttonBtn,
      subTextItem,
      featuresWrapper,
    ].filter(Boolean),
  });
}

/**
 * Create plans content layout with 4 plan items (Free, Pro, Team, Enterprise)
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
      item(ui, "pro", options.pro),
      item(ui, "team", options.team),
      item(ui, "enterprise", options.enterprise),
    ],
  });
}

export default billing_content;
