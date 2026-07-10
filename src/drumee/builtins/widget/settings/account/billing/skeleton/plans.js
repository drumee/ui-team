const { button } = require("../../../../../skeleton/toolkit");

/**
 * Build the plan catalogue for display. Text comes from LOCALE; prices come
 * from the server catalog (Stripe truth) via ui._catPrice, so nothing here is
 * hardcoded. Rebuilt per render so a language switch is reflected immediately.
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

  return {
    free: {
      title: LOCALE.FREE,
      subtitle: LOCALE.FREE,
      description: "",
      buttonTitle: "",
      features: [
        { main: "20G", sub: LOCALE.FEAT_STORAGE },
        { main: LOCALE.NONE, sub: LOCALE.FEAT_ADMIN_ROLES },
      ],
    },
    pro: {
      title: LOCALE.PRO,
      subtitle: (isYear ? LOCALE.PRICE_FROM_PER_YEAR : LOCALE.PRICE_FROM_PER_MONTH).format(proPrice),
      description: LOCALE.PLAN_PRO_DESC.format(seatPrice),
      buttonTitle: LOCALE.UPGRADE,
      badge: 1,
      features: [
        { main: "20G", sub: LOCALE.FEAT_STORAGE },
        { main: "5", sub: LOCALE.FEAT_EDITOR_ACCESS },
        { main: "1", sub: LOCALE.FEAT_ADMIN_ROLE },
        { main: "7", sub: LOCALE.FEAT_DAYS_VERSION_HISTORY },
        { main: "", sub: LOCALE.FEAT_PERMISSIONS_ROLES },
        { main: "", sub: LOCALE.FEAT_GUEST_ACCESS },
      ],
    },
    team: {
      title: LOCALE.TEAM,
      subtitle: (isYear ? LOCALE.PRICE_PER_SEAT_YEAR : LOCALE.PRICE_PER_SEAT_MONTH).format(teamPrice),
      description: LOCALE.PLAN_TEAM_DESC,
      buttonTitle: LOCALE.CHOOSE_TEAM,
      features: [
        { main: "50G", sub: LOCALE.FEAT_STORAGE_PER_SEAT },
        { main: LOCALE.ORG, sub: LOCALE.FEAT_DOMAIN_WIDE },
        { main: "30", sub: LOCALE.FEAT_DAYS_VERSION_HISTORY },
        { main: "", sub: LOCALE.FEAT_ADMIN_BILLING },
      ],
    },
    enterprise: {
      title: LOCALE.ENTERPRISE,
      subtitle: LOCALE.CONTACT_SALES,
      description: LOCALE.PLAN_ENTERPRISE_DESC,
      buttonTitle: LOCALE.CONTACT_SALES,
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
 * Create plan item component (Free, Pro, Team, Enterprise)
 * Display title, subtitle, description, button, features list, and popular badge
 * @param {Object} ui - UI instance
 * @param {string} opt - Plan option key (free, pro, team, enterprise)
 * @param {Object} option - Pre-built option object from getOptions
 * @returns {Object} Skeletons component
 */
function item(ui, opt, option) {
  const { title, subtitle, description, buttonTitle, features, badge } = option;
  const fig = `${ui.fig.family}__plan`;
  // Mark the caller's active plan: pill-style "Your current plan" instead of a
  // CTA (design: the Free card shows the pill while the user is on Free).
  const isCurrent = (ui.currentPlanName || "free") === opt;

  let descriptionItem = "";

  if (description) {
    descriptionItem = Skeletons.Note({
      className: `${fig}-description`,
      content: description,
    });
  }

  const header = Skeletons.Box.Y({
    className: `${fig}-header`,
    kids: [
      Skeletons.Note({
        className: `${fig}-title`,
        content: title,
      }),
      Skeletons.Note({
        className: `${fig}-subtitle`,
        content: subtitle,
      }),
      descriptionItem,
    ],
  });

  let buttonBtn = "";

  if (isCurrent) {
    buttonBtn = Skeletons.Box.X({
      className: `${fig}-button current`,
      dataset: { disabled: 1 },
      kids: [
        Skeletons.Note({
          className: `${fig}-current-label`,
          content: LOCALE.YOUR_CURRENT_PLAN || "Your current plan",
        }),
      ],
    });
  } else if (buttonTitle) {
    buttonBtn = button(ui, {
      label: buttonTitle,
      className: `${fig}-button ${badge ? "popular" : ""}`,
      service: "select-plan-button",
      value: opt,
      name: opt,
      formItem: 1,
      priority: "primary",
      uiHandler: [ui],
    });
  } else {
    buttonBtn = button(ui, {
      label: LOCALE.GET_STARTED,
      className: `${fig}-button ${badge ? "popular" : ""}`,
      service: "select-plan-button",
      name: opt,
      formItem: 1,
      value: opt,
      priority: "secondary",
      uiHandler: [ui],
    });
  }

  const featureItems = features.map((f) => {
    const feature = typeof f === "string" ? { main: f, sub: "" } : f;
    const { main, sub } = feature;

    return Skeletons.Box.X({
      className: `${fig}-features item`,
      uiHandler: [ui],
      kids: [
        Skeletons.Button.Label({
          flow: _a.x,
          ico: "available",
          label: main,
        }),
        sub
          ? Skeletons.Note({
              className: `${fig}-features-sub`,
              content: sub,
            })
          : null,
      ].filter(Boolean),
    });
  });

  let popularBadge = "";

  if (badge) {
    popularBadge = Skeletons.Box.X({
      className: `${fig} popular-badge`,
      kids: [
        Skeletons.Note({
          content: LOCALE.MOST_POPULAR,
        }),
      ],
    });
  }

  const featuresWrapper = Skeletons.Box.Y({
    className: `${fig}-features`,
    kids: featureItems,
  });

  return Skeletons.Box.Y({
    className: `${fig}-item ${badge ? "popular" : ""}`,
    kids: [header, buttonBtn, featuresWrapper, popularBadge],
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
