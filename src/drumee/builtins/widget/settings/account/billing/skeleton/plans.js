const { button } = require("../../../../../skeleton/toolkit");

const OPTIONS = {
  free: {
    title: "Free",
    subtitle: "Free",
    description: "",
    buttonTitle: "",
    unit_price: 0,
    features: [
      { main: "20G", sub: "storage" },
      { main: "None", sub: "admin roles" },
    ],
  },
  pro: {
    title: "Pro",
    subtitle_monthly: "Start from $16.99 / month",
    subtitle_yearly: "Start from $14.44 / month",
    description: "5 seats included, each additional seat $5",
    buttonTitle: "Upgrade",
    unit_price_monthly: 1699,
    unit_price_yearly: 1444,
    badge: 1,
    features: [
      { main: "20G", sub: "storage" },
      { main: "5", sub: "editor access" },
      { main: "1", sub: "admin role" },
      { main: "7", sub: "days version history" },
      { main: "", sub: "Permissions & roles" },
      { main: "", sub: "Guest access" },
    ],
  },
  team: {
    title: "Team",
    subtitle_monthly: "$8 / seat / month",
    subtitle_yearly: "$80 / seat / year",
    description: "Per-seat plan for your whole organization (admins only)",
    buttonTitle: "Choose Team",
    unit_price_monthly: 800,
    unit_price_yearly: 8000,
    features: [
      { main: "50G", sub: "storage per seat" },
      { main: "Org", sub: "domain-wide entitlement" },
      { main: "30", sub: "days version history" },
      { main: "", sub: "Admin-managed billing" },
    ],
  },
  enterprise: {
    title: "Enterprise",
    subtitle: "Contact sales",
    description: "Custom pricing for your team",
    buttonTitle: "Contact sales",
    features: [
      { main: "Custom", sub: "storage" },
      { main: "Custom", sub: "editor access" },
      { main: "Yes", sub: "admin role" },
      { main: "Up to 90 days", sub: "version history" },
      { main: "", sub: "Permissions & roles" },
      { main: "", sub: "Guest access" },
      { main: "", sub: "Activity logs" },
    ],
  },
};

/**
 * Create plan item component (Free, Pro, Enterprise)
 * Display title, subtitle, description, button, features list, and popular badge
 * @param {Object} ui - UI instance
 * @param {string} opt - Plan option key (free, pro, enterprise)
 * @param {string} cycle - Billing cycle (monthly or yearly)
 * @returns {Object} Skeletons component
 */
function item(ui, opt, cycle = "monthly") {
  const option = OPTIONS[opt];
  const { title, description, buttonTitle, features, badge } = option;
  const subtitle =
    cycle === "yearly" && option.subtitle_yearly
      ? option.subtitle_yearly
      : option.subtitle_monthly || option.subtitle || "Free";
  const fig = `${ui.fig.family}__plan`;

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

  if (buttonTitle) {
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
      label: "Get started",
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
          content: "Most Popular",
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
 * Create plans content layout with 3 plan items (Free, Pro, Enterprise)
 * @param {Object} ui - UI instance
 * @param {string} cycle - Billing cycle (monthly or yearly)
 * @returns {Object} Skeletons component
 */
function billing_content(ui, cycle = "monthly") {
  const fig = `${ui.fig.family}__plans`;

  return Skeletons.Box.G({
    className: `${fig}-main`,
    kids: [
      item(ui, "free", cycle),
      item(ui, "pro", cycle),
      item(ui, "team", cycle),
      item(ui, "enterprise", cycle),
    ],
  });
}

export default billing_content;
