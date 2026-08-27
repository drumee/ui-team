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
  // Team and Business are the self-serve tiers (July 2026 final table made
  // Business purchasable), so both read their Stripe price from the catalog.
  // Sovereign stays sales-led: its amount is the published figure, shown so
  // the ladder reads as a ladder, with a sales CTA instead of checkout.
  const proPrice = money(ui._catPrice("pro", period) ?? (isYear ? 50 : 5));
  const teamPrice = money(ui._catPrice("team", period));
  const businessPrice = money(
    ui._catPrice("business", period) ?? (isYear ? 990 : 99),
  );
  const sovereignPrice = money(isYear ? 4990 : 499); // yearly = 10x monthly, two months free

  const perMonth = LOCALE.PER_MONTH;
  const perYear = LOCALE.PER_YEAR;
  const per = isYear ? perYear : perMonth;

  // One row per feature the plan ACTUALLY includes, value first and bold, the
  // noun after it in regular weight — "100 GB storage", "Up to 10 member".
  // Follows Figma 2769-213751.
  //
  // This replaced a fixed 13-row template rendered identically on all four
  // cards, with the rows a plan lacked struck through. That shape existed to
  // serve the side-by-side comparison table; once the label column goes away
  // (the cards are the only layout now) repeating every label four times and
  // padding the cheap plans with crossed-out lines is just noise — Free showed
  // nine strikethroughs for four real features.
  //
  // A row is { value, label }. `label` is optional: rows the design writes as a
  // single bold phrase ("Guest access", "SSO / SAML") carry only a value.
  const row = (value, label) => ({ value, label });

  return {
    free: {
      title: LOCALE.FREE,
      priceAmount: money(0),
      pricePeriod: per,
      buttonTitle: LOCALE.CTA_START_FREE,
      buttonKind: "secondary",
      subText: LOCALE.PLAN_FREE_DESC,
      features: [
        row("1", LOCALE.FEAT_UNIT_HUB),
        // 3, not "1 (solo)" — the 2026-08-14 restructure opens invites on the
        // entry tiers. Counts the owner, like every other tier's number.
        row(LOCALE.UP_TO_3, LOCALE.FEAT_UNIT_MEMBER),
        // 25 GB since the 2026-08-18 pricing change. The figure lives in the
        // catalog (yp.plan free.quota.$.disk) and is mirrored here as a literal
        // like every other card's — see schemas
        // yellow_page/patches/2026-08-18-free-plan-25gb.sql.
        row("25 GB", LOCALE.FEAT_UNIT_STORAGE),
        // NOT ENFORCED YET. The 1-pager's Free/Pro split on task depth and
        // meeting length is labelled here first, gate to follow. Both under-
        // promise for now — a Free account actually gets the full tracker and
        // uncapped meetings — which is the safe direction to be wrong in, and
        // sets the expectation before anything is taken away.
        row(LOCALE.FEAT_TASK_BOARD_LIST),
        row(LOCALE.FEAT_MEET_ADHOC_45),
        row(LOCALE.SUPPORT_COMMUNITY, LOCALE.FEAT_UNIT_SUPPORT),
      ],
    },
    // Personal paid tier (2026-08-03 pricing table): one person, their
    // guests, and real sharing. Sits between Free and Team; no org, no
    // admin console — the card lists what it HAS, per the house style.
    pro: {
      title: LOCALE.PRO,
      priceAmount: proPrice,
      pricePeriod: per,
      buttonTitle: LOCALE.CTA_GO_PRO,
      buttonKind: "primary",
      subText: LOCALE.PLAN_PRO_DESC,
      features: [
        row("1", LOCALE.FEAT_UNIT_HUB),
        row(LOCALE.UP_TO_3, LOCALE.FEAT_UNIT_MEMBER),
        row(LOCALE.UNLIMITED, LOCALE.FEAT_UNIT_GUESTS),
        row("50 GB", LOCALE.FEAT_UNIT_STORAGE),
        row(LOCALE.FEAT_UNLIMITED_LINKS),
        row(LOCALE.DAYS_7, LOCALE.FEAT_UNIT_VERSION_HISTORY),
        // NOT ENFORCED YET — labels ahead of the gate, same as Free above.
        row(LOCALE.FEAT_TASK_TRACKER_FULL),
        row(LOCALE.FEAT_MEET_SCHEDULED),
        // This one OVER-promises, unlike the two above, and is the single line
        // to pull if that is not wanted before the gate lands: Pro gains the
        // Admin panel in the 1-pager, but needsAdminConsoleUpgrade() still
        // sends Pro to the upsell. Until that gate opens, a $5 payer reads
        // "Admin panel" on the card and cannot open one.
        row(LOCALE.FEAT_ADMIN_NO_SDK),
        row(LOCALE.SUPPORT_COMMUNITY, LOCALE.FEAT_UNIT_SUPPORT),
      ],
    },
    // The entry ORG paid tier.
    team: {
      title: LOCALE.TEAM,
      priceAmount: teamPrice,
      pricePeriod: per,
      buttonTitle: LOCALE.CTA_START_WORKSPACE,
      buttonKind: "primary",
      badge: 1,
      subText: LOCALE.PLAN_TEAM_DESC,
      features: [
        row("1", LOCALE.FEAT_UNIT_HUB),
        row(LOCALE.UP_TO_10, LOCALE.FEAT_UNIT_MEMBER),
        row("100 GB", LOCALE.FEAT_UNIT_STORAGE),
        row(LOCALE.DAYS_30, LOCALE.FEAT_UNIT_VERSION_HISTORY),
        row(LOCALE.FEAT_GUEST_ACCESS),
        // NOT ENFORCED YET — labels ahead of the gate, same as Free and Pro.
        row(LOCALE.FEAT_TASK_TRACKER_FULL),
        row(LOCALE.FEAT_MEET_SCHEDULED),
        row(LOCALE.FEAT_ADMIN_PANEL),
        row(LOCALE.SUPPORT_EMAIL, LOCALE.FEAT_UNIT_SUPPORT),
      ],
    },
    // Self-serve since the July 2026 final table: checks out (or switches the
    // live subscription) like Team instead of pointing at sales.
    business: {
      title: LOCALE.BUSINESS,
      priceAmount: businessPrice,
      pricePeriod: per,
      buttonTitle: LOCALE.CTA_START_BUSINESS,
      buttonKind: "dark",
      subText: LOCALE.PLAN_BUSINESS_DESC,
      features: [
        row(LOCALE.MULTIPLE, LOCALE.FEAT_UNIT_HUBS),
        row(LOCALE.UNLIMITED, LOCALE.FEAT_UNIT_MEMBER),
        row("1 TB", LOCALE.FEAT_UNIT_STORAGE),
        row(LOCALE.ONE_YEAR, LOCALE.FEAT_UNIT_VERSION_HISTORY),
        row(LOCALE.FEAT_GUEST_ACCESS),
        row(LOCALE.FEAT_ADMIN_PANEL_AUDIT),
        row(LOCALE.FEAT_API_ACCESS),
        row(LOCALE.FEAT_SSO_SAML),
        row(LOCALE.SUPPORT_PRIORITY_SLA, LOCALE.FEAT_UNIT_SUPPORT),
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
        row(LOCALE.FULL_OS, LOCALE.FEAT_UNIT_HUBS),
        row(LOCALE.UNLIMITED, LOCALE.FEAT_UNIT_MEMBER),
        row(LOCALE.YOUR_INFRASTRUCTURE, LOCALE.FEAT_UNIT_STORAGE),
        row(LOCALE.UNLIMITED, LOCALE.FEAT_UNIT_VERSION_HISTORY),
        row(LOCALE.FEAT_GUEST_ACCESS),
        row(LOCALE.FEAT_ADMIN_PANEL_SDK),
        row(LOCALE.FEAT_API_ACCESS_SDK),
        row(LOCALE.FEAT_SSO_SAML),
        row(LOCALE.SUPPORT_DEDICATED_SLA, LOCALE.FEAT_UNIT_SUPPORT),
      ],
    },
  };
}

/**
 * Is this card the caller's actual subscription — the plan AND the billing
 * cycle the cards are currently priced in?
 *
 * Matching on the plan alone made a Team-monthly subscriber's Team card read
 * "Your current plan" on the Yearly tab too, so the $319/year offer beside it
 * was inert: the card could not be clicked and the checkout tab is closed to a
 * live subscription. One helper, used by the CTA and by both layouts' current-
 * card styling, so they cannot disagree about what "current" means.
 * @param {Object} ui - UI instance
 * @param {string} opt - plan key
 * @returns {boolean}
 */
function isCurrentSubscription(ui, opt) {
  if ((ui.currentPlanName || "free") !== opt) return false;
  // Free has no cycle, and without a subscription row there is no cycle to
  // compare against — the plan match is the whole answer.
  if (opt === "free" || !ui._subscription || !ui._selectedCycle) return true;
  const subPeriod = /^year/.test(String(ui._subscription.period || ""))
    ? "year" : "month";
  return ui._selectedCycle() === subPeriod;
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
  // The label row is rendered on EVERY card, blank where the plan has none.
  // Only Sovereign carries one ("Start from"), and that single extra line made
  // its tinted header 97px against 81px on the other three — the boxes did not
  // line up and neither did the prices. Reserving the row equalises them by
  // construction, so it survives a change of font size or label; pinning
  // min-height to today's 97px would silently drift apart again.
  priceKids.push(
    Skeletons.Note({
      className: `${fig}-price-label${priceLabel ? "" : " is-placeholder"}`,
      content: priceLabel || " ",
    }),
  );
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
  const { buttonKind } = option;
  let { buttonTitle } = option;
  const isCurrent = isCurrentSubscription(ui, opt);
  if (!isCurrent && (ui.currentPlanName || "free") === opt) {
    // Same plan, other rhythm: say what the click does.
    buttonTitle = (LOCALE.PLAN_CHANGE_TITLE_CYCLE || "Switch to {0} billing")
      .format(ui._selectedCycle() === "year" ? LOCALE.YEARLY : LOCALE.MONTHLY);
  }

  // Billing is owner-managed: inside an org (domain_id > 1) only the OWNER may
  // change the plan. Without this the CTA looked live for every member and only
  // failed at the very last step, where payment.checkout answers
  // ORG_IDENT_REQUIRED (they own no org) or ALREADY_IN_OTHER_DOMAIN (they
  // cannot bootstrap a second one) — a raw status code after a full checkout
  // walk. Same rule as the sidebar entry, from the same helper, so the two can
  // never disagree.
  // Prefer the widget's resolved verdict (server-backed) over the local
  // ownership guess — see settings_billing._mayCheckout.
  //
  // A card showing the caller's OWN plan is never "locked": making isCurrent
  // cycle-aware meant a non-owner member viewing the other cycle tab saw their
  // own plan's card turn into "Only the owner can change the plan" — a
  // permissions answer to a question they had not asked, replacing the one
  // useful fact on the page. Same plan, whatever the cycle, is not a change.
  const ownPlan = (ui.currentPlanName || "free") === opt;
  const locked =
    !ownPlan && !(ui._mayCheckout ? ui._mayCheckout() : canUpgradePlan());

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
  } else if (/^(pro|team|business)$/.test(opt) && ui._catSellable && !ui._catSellable(opt)) {
    // The catalog has no Stripe price for this plan in this environment, so
    // there is nothing to sell: both checkout and change_plan answer NO_PRICE.
    // Say that instead of taking the buyer through a priced confirm dialog to
    // a generic failure.
    buttonBtn = Skeletons.Box.X({
      className: `${fig}-button-main locked`,
      dataset: { disabled: 1 },
      kids: [
        Skeletons.Note({
          className: `${fig}-current-label`,
          content: LOCALE.PLAN_NOT_AVAILABLE_HERE,
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
  const isCurrent = isCurrentSubscription(ui, opt);

  const buttonBtn = ctaButton(ui, fig, opt, option);

  const subTextItem = subText
    ? Skeletons.Note({ className: `${fig}-subtext`, content: subText })
    : null;

  // Value first and bold, the noun after it in regular weight — the reading
  // order of the design ("100 GB storage"), and the reason -feature-main is the
  // 600-weight class while -feature-sub is 400. Rows written as one bold phrase
  // ("Guest access") carry no label and render just the value.
  //
  // Every row is an entitlement now, so the tick is unconditional; there is no
  // excluded/struck-through state left to render.
  const featureItems = features.map((f) => {
    const feature = typeof f === "string" ? { value: f } : f;
    const { value, label } = feature;

    return Skeletons.Box.X({
      className: `${fig}-feature`,
      kids: [
        Skeletons.Image.Svg({
          ico: "available",
          className: `${fig}-feature-icon`,
        }),
        Skeletons.Box.X({
          className: `${fig}-feature-text`,
          kids: [
            Skeletons.Note({ className: `${fig}-feature-main`, content: value }),
            label
              ? Skeletons.Note({ className: `${fig}-feature-sub`, content: label })
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
 * Plans view: the four cards, side by side and each self-contained.
 *
 * There used to be a second, wide layout as well — a comparison table with a
 * leading label column and one column per plan — rendered alongside the cards
 * with a container query picking one. Figma 2769-213751 drops it: the labels
 * live inside each card now, so the same shape serves every width and the
 * feature names are never separated from the plan they belong to.
 *
 * Box.G wraps: four across when there is room, folding to two and then one as
 * the container narrows (see skin/index.scss, .settings-billing__plans-narrow).
 * @param {Object} ui - UI instance
 * @param {string} cycle - Billing cycle (monthly or yearly)
 * @returns {Object} Skeletons component
 */
function billing_content(ui, cycle = "monthly") {
  const fig = `${ui.fig.family}__plans`;
  const options = getOptions(ui, cycle);

  return Skeletons.Box.Y({
    className: `${fig}-main`,
    kids: [
      // Box.X, not Box.G. The row's SCSS is written in flex terms — `flex-wrap:
      // wrap` on the row and `flex: 1 1 260px` on each card, narrowing to
      // `1 1 100%` under 620px. Box.G renders `display: grid`, where none of
      // that applies: with no grid-template the four cards fall into a single
      // column. It only ever looked right because the container query that
      // revealed this layout also forced `display: flex !important`; removing
      // that query took the flex context with it.
      Skeletons.Box.X({
        className: `${fig}-narrow`,
        kids: [
          item(ui, "free", options.free),
          item(ui, "pro", options.pro),
          item(ui, "team", options.team),
          item(ui, "business", options.business),
          item(ui, "sovereign", options.sovereign),
        ],
      }),
    ],
  });
}

export default billing_content;
