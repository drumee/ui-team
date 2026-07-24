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

  // Transcribed row-for-row from tmp/THE FINAL TABLE — Publish This.md.
  // Same rows, same order, every card: the table IS the spec.
  const rows = (col) => [
    { label: LOCALE.FEAT_DEPLOYMENT, value: col.deployment },
    { label: LOCALE.FEAT_WORKSPACES, value: col.workspaces },
    { label: LOCALE.FEAT_MEMBERS, value: col.members },
    { label: LOCALE.FEAT_STORAGE, value: col.storage },
    { label: LOCALE.FEAT_FILES_CHAT, value: "", tick: true },
    { label: LOCALE.FEAT_PERMISSIONS, value: col.permissions, included: col.permissions !== LOCALE.NONE },
    { label: LOCALE.FEAT_VERSION_HISTORY, value: col.history, included: col.history !== LOCALE.NONE },
    { label: LOCALE.FEAT_GUEST_ACCESS, value: "", included: col.guest, tick: true },
    { label: LOCALE.FEAT_ADMIN_PANEL, value: col.admin || "", included: col.admin !== false, tick: true },
    { label: LOCALE.FEAT_API_ACCESS, value: col.api || "", included: col.api !== false, tick: true },
    { label: LOCALE.FEAT_SSO_SAML, value: "", included: col.sso, tick: true },
    { label: LOCALE.FEAT_SUPPORT, value: col.support },
    { label: LOCALE.FEAT_DATA_CONTROL, value: col.data },
  ];

  return {
    free: {
      title: LOCALE.FREE,
      priceAmount: money(0),
      pricePeriod: per,
      buttonTitle: LOCALE.CTA_START_FREE,
      buttonKind: "secondary",
      subText: LOCALE.PLAN_FREE_DESC,
      features: rows({
        deployment: LOCALE.SAAS, workspaces: "1", members: LOCALE.ONE_SOLO, storage: "5 GB",
        permissions: LOCALE.NONE, history: LOCALE.NONE, guest: false,
        admin: false, api: false, sso: false,
        support: LOCALE.SUPPORT_COMMUNITY, data: LOCALE.TRUST_DRUMEE,
      }),
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
      features: rows({
        deployment: LOCALE.SAAS, workspaces: "1", members: LOCALE.UP_TO_10, storage: "100 GB",
        permissions: LOCALE.GRANULAR_ROLE_BASED, history: LOCALE.DAYS_30, guest: true,
        admin: "", api: false, sso: false,
        support: LOCALE.SUPPORT_EMAIL, data: LOCALE.TRUST_DRUMEE,
      }),
    },
    business: {
      title: LOCALE.BUSINESS,
      priceAmount: businessPrice,
      pricePeriod: per,
      buttonTitle: LOCALE.CTA_TALK_TO_SALES,
      buttonKind: "dark",
      subText: LOCALE.PLAN_BUSINESS_DESC,
      features: rows({
        deployment: LOCALE.SAAS, workspaces: LOCALE.MULTIPLE, members: LOCALE.UNLIMITED, storage: "1 TB",
        permissions: LOCALE.GRANULAR_AUDIT, history: LOCALE.ONE_YEAR, guest: true,
        admin: LOCALE.PLUS_AUDIT_LOGS, api: "", sso: true,
        support: LOCALE.SUPPORT_PRIORITY_SLA, data: LOCALE.TRUST_DRUMEE,
      }),
    },
    sovereign: {
      title: LOCALE.SOVEREIGN,
      priceLabel: LOCALE.START_FROM,
      priceAmount: sovereignPrice,
      pricePeriod: per,
      buttonTitle: LOCALE.CTA_GET_SOVEREIGN_NODE,
      buttonKind: "dark",
      subText: LOCALE.PLAN_SOVEREIGN_DESC,
      features: rows({
        deployment: LOCALE.SELF_HOSTED, workspaces: LOCALE.FULL_OS, members: LOCALE.UNLIMITED,
        storage: LOCALE.YOUR_INFRASTRUCTURE,
        permissions: LOCALE.FULL_ACL, history: LOCALE.UNLIMITED, guest: true,
        admin: LOCALE.PLUS_SDK, api: LOCALE.PLUS_SDK, sso: true,
        support: LOCALE.SUPPORT_DEDICATED_SLA, data: LOCALE.ZERO_TRUST,
      }),
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

/**
 * The card's call to action. Shared by the mobile cards and the desktop
 * comparison table so both surfaces show the same state — current plan,
 * owner-locked, or an actionable CTA — and can never drift apart.
 * @param {Object} ui - UI instance
 * @param {string} fig - BEM prefix
 * @param {string} opt - plan key
 * @param {Object} option - plan option
 * @returns {Object} Skeletons component
 */
function ctaButton(ui, fig, opt, option) {
  const { buttonTitle, buttonKind } = option;
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

  return buttonBtn;
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
  const isCurrent = (ui.currentPlanName || "free") === opt;

  const buttonBtn = ctaButton(ui, fig, opt, option);

  const subTextItem = subText
    ? Skeletons.Note({ className: `${fig}-subtext`, content: subText })
    : null;

  // One row per row of the published pricing table, in the table's order, on
  // every card — that is what makes the four cards comparable. Rows the plan
  // does NOT get are shown struck through rather than dropped: a buyer needs
  // to see where a tier stops, and silently omitting them hid exactly that.
  //
  // Label first, value second (the table reads "Storage | 5 GB"). The previous
  // value-first order worked for quantities but broke everything else —
  // "SaaS Deployment", "Trust Drumee Data control", "Your infrastructure
  // storage".
  const featureItems = features.map((f) => {
    const feature = typeof f === "string" ? { label: f, value: "", included: true } : f;
    const { label, value } = feature;
    const included = feature.included !== false;

    return Skeletons.Box.X({
      className: `${fig}-feature ${included ? "" : "excluded"}`,
      kids: [
        Skeletons.Image.Svg({
          ico: included ? "available" : "cross",
          className: `${fig}-feature-icon`,
        }),
        Skeletons.Box.X({
          className: `${fig}-feature-text`,
          kids: [
            Skeletons.Note({ className: `${fig}-feature-sub`, content: label }),
            value
              ? Skeletons.Note({ className: `${fig}-feature-main`, content: value })
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
 * One cell of the comparison table.
 *
 * A tick-only row (Files + folder chat, Guest access, SSO/SAML) renders just
 * the mark — repeating the feature name in all four columns is what the label
 * column exists to avoid. Rows carrying a value show the value next to the
 * mark, and a row the plan does not get shows a cross, so the eye can run down
 * a column and see where the tier stops.
 * @param {Object} ui - UI instance
 * @param {string} fig - BEM prefix
 * @param {Object} cell - { value, included }
 * @returns {Object} Skeletons component
 */
function compareCell(ui, fig, cell, colKey) {
  const included = cell.included !== false;
  // The mark carries meaning only where the table itself uses one. On a value
  // row the value IS the answer, so a leading tick beside "SaaS" or "Trust
  // Drumee" is pure noise — it was on every row and made the columns hard to
  // scan. A cross always shows, though: that is how a column tells you where
  // the tier stops.
  const showMark = cell.tick || !included;
  return Skeletons.Box.X({
    className: `${fig}-cell ${fig}-value ${fig}-col ${fig}-col-${colKey} ${included ? "" : "excluded"}`,
    kids: [
      showMark
        ? Skeletons.Image.Svg({
            ico: included ? "available" : "cross",
            className: `${fig}-mark`,
          })
        : null,
      cell.value
        ? Skeletons.Note({ className: `${fig}-text`, content: cell.value })
        : null,
    ].filter(Boolean),
  });
}

/**
 * Desktop layout: a real comparison table — a leading label column plus one
 * column per plan, so the four offers line up on the same rows and can be read
 * across. The stacked cards repeat every label four times, which is fine on a
 * phone (one column at a time) but makes comparison hard on a wide screen.
 *
 * Both layouts are built from the SAME getOptions data, in the same row order,
 * so they can never disagree about what a plan includes.
 * @param {Object} ui - UI instance
 * @param {Object} options - keyed plan options
 * @returns {Object} Skeletons component
 */
function comparisonTable(ui, options) {
  const fig = `${ui.fig.family}__compare`;
  const keys = ["free", "team", "business", "sovereign"];
  const cols = keys.map((k) => options[k]);
  const labels = cols[0].features.map((f) => f.label);

  // Header: an empty corner over the label column, then each plan's price
  // header and its CTA.
  const header = Skeletons.Box.X({
    className: `${fig}-row ${fig}-header`,
    kids: [
      Skeletons.Box.Y({ className: `${fig}-cell ${fig}-label ${fig}-corner` }),
      ...keys.map((k, i) =>
        Skeletons.Box.Y({
          className: `${fig}-cell ${fig}-plan ${fig}-col ${fig}-col-${k}`,
          kids: [
            priceHeader(ui, `${ui.fig.family}__plan`, cols[i], (ui.currentPlanName || "free") === k),
            ctaButton(ui, `${ui.fig.family}__plan`, k, cols[i]),
            cols[i].subText
              ? Skeletons.Note({ className: `${fig}-tagline`, content: cols[i].subText })
              : null,
          ].filter(Boolean),
        })
      ),
    ],
  });

  const body = labels.map((label, i) =>
    Skeletons.Box.X({
      className: `${fig}-row`,
      kids: [
        Skeletons.Box.Y({
          className: `${fig}-cell ${fig}-label`,
          kids: [Skeletons.Note({ className: `${fig}-label-text`, content: label })],
        }),
        ...cols.map((c, ci) => compareCell(ui, fig, c.features[i], keys[ci])),
      ],
    })
  );

  return Skeletons.Box.Y({ className: `${fig}-main`, kids: [header, ...body] });
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

  // BOTH layouts are rendered and CSS picks one, deliberately.
  //
  // The previous cut branched on Visitor.isMobile(), which reads the DEVICE
  // (user agent) rather than the window: a desktop browser narrowed to 500px
  // still got the 1079px-wide table, and nothing reflowed on resize because
  // the choice was frozen at render time. A width media query is the only
  // thing that actually tracks the viewport.
  //
  // Narrow screens keep the stacked cards — one plan at a time, every row
  // labelled in place, the only readable shape when the columns won't fit.
  return Skeletons.Box.Y({
    className: `${fig}-main`,
    kids: [
      Skeletons.Box.Y({
        className: `${fig}-wide`,
        kids: [comparisonTable(ui, options)],
      }),
      Skeletons.Box.G({
        className: `${fig}-narrow`,
        kids: [
          item(ui, "free", options.free),
          item(ui, "team", options.team),
          item(ui, "business", options.business),
          item(ui, "sovereign", options.sovereign),
        ],
      }),
    ],
  });
}

export default billing_content;
