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
        { main: "20 GB", sub: LOCALE.FEAT_STORAGE },
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
 * The "Popular" highlight is an upsell cue aimed at users below Pro. Once the
 * user sits on a higher tier (team/enterprise) the Pro card must not carry the
 * active/focused look — only the current plan's card does. The badge chip
 * itself stays; only the tinted/primary styling is suppressed.
 * @param {Object} ui - UI instance
 * @param {number} badge - the option's badge flag
 * @returns {boolean} whether the popular styling applies
 */
function popularHighlight(ui, badge) {
  return !!badge && !/^(team|enterprise)$/i.test(ui.currentPlanName || "");
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
 * Create plan item component (Free, Pro, Team, Enterprise): price-header box →
 * pill CTA → sub-text → feature list. Follows Figma 3050-96140.
 * @param {Object} ui - UI instance
 * @param {string} opt - Plan option key (free, pro, team, enterprise)
 * @param {Object} option - Pre-built option object from getOptions
 * @returns {Object} Skeletons component
 */
function item(ui, opt, option) {
  const { buttonTitle, buttonKind, subText, features, badge } = option;
  const fig = `${ui.fig.family}__plan`;
  // Mark the caller's active plan: pill-style "Your current plan" instead of a
  // CTA (design: the Free card shows the pill while the user is on Free).
  const isCurrent = (ui.currentPlanName || "free") === opt;

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
