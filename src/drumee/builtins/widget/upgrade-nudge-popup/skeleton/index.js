/**
 * Upgrade-nudge popup skeleton — the Figma "Upgrade Trigger" card, three
 * faces (storage / seats / age) on one 398px sheet: warning badge, centered
 * headline, family-specific meter, "Upgrade to X and get:" benefit list,
 * full-width brand CTA, "Not now".
 *
 * The benefit sets are the Figma card's own, keyed by the plan being sold
 * (server's target_plan). Copy waits on final Team/Business pricing from
 * marketing — LOCALE keys first, the Figma strings as fallbacks, exactly the
 * over-limit-popup arrangement, so the words can change without a deploy.
 */
const { canUpgradePlan } = require("libs/billing");
const { filesize } = require("@drumee/ui-essentials");

function planLabel(plan) {
  const p = String(plan || "");
  return p ? p.charAt(0).toUpperCase() + p.slice(1) : "";
}

/**
 * Benefit rows per plan being sold — copy from the "Upgrade Popup Templates"
 * doc linked in the Figma comments. Order follows the doc: the storage face
 * leads with storage, the duration/seat faces lead with members; the seat
 * face also carries its own sub-lines for the member perk.
 */
function benefitRows(target, family) {
  const seats = family === "seats";
  const leadMembers = family === "age" || seats;
  switch (target) {
    case "pro":
      return [
        [LOCALE.UN_B_PRO_STORAGE || "10× storage", LOCALE.UN_B_PRO_STORAGE_SUB || "up to 50 GB total"],
        [LOCALE.UN_B_PRO_TRACKER || "Premium task tracker", LOCALE.UN_B_PRO_TRACKER_SUB || "Calendar, Gantt, Project health view"],
        [LOCALE.UN_B_PRO_MEETINGS || "Unlimited meetings", LOCALE.UN_B_PRO_MEETINGS_SUB || "no more time limits on calls"],
      ];
    case "business": {
      const storage = [LOCALE.UN_B_BIZ_STORAGE || "10× storage", LOCALE.UN_B_BIZ_STORAGE_SUB || "up to 1 TB total"];
      const members = [
        LOCALE.UN_B_BIZ_MEMBERS || "Unlimited members",
        seats
          ? (LOCALE.UN_B_BIZ_MEMBERS_SEATS_SUB || "no more seat limits")
          : (LOCALE.UN_B_BIZ_MEMBERS_SUB || "bring your whole organization in"),
      ];
      const hubs = [LOCALE.UN_B_BIZ_HUBS || "Unlimited hubs", LOCALE.UN_B_BIZ_HUBS_SUB || "separate spaces per client or department"];
      const console_ = [LOCALE.UN_B_BIZ_CONSOLE || "Premium admin console", LOCALE.UN_B_BIZ_CONSOLE_SUB || "full audit log included"];
      return leadMembers ? [members, hubs, storage, console_] : [storage, members, hubs, console_];
    }
    case "team":
    default: {
      const storage = [LOCALE.UN_B_TEAM_STORAGE || "2× storage", LOCALE.UN_B_TEAM_STORAGE_SUB || "up to 100 GB total"];
      const members = [
        LOCALE.UN_B_TEAM_MEMBERS || "10 members",
        seats
          ? (LOCALE.UN_B_TEAM_MEMBERS_SEATS_SUB || "room for your whole team")
          : (LOCALE.UN_B_TEAM_MEMBERS_SUB || "bring more of your team in"),
      ];
      const console_ = [LOCALE.UN_B_TEAM_CONSOLE || "Admin console", LOCALE.UN_B_TEAM_CONSOLE_SUB || "see and manage who has access"];
      return leadMembers ? [members, storage, console_] : [storage, members, console_];
    }
  }
}

/** "Used ... 70 GB / 100 GB" meter — amber below 90%, red from 90 up. */
function meter(fig, labelLeft, labelRight, pct, danger) {
  return Skeletons.Box.Y({
    className: `${fig}__meter`,
    kids: [
      Skeletons.Box.X({
        className: `${fig}__meter-labels`,
        kids: [
          Skeletons.Note({ className: `${fig}__meter-left`, content: labelLeft }),
          Skeletons.Note({ className: `${fig}__meter-right`, content: labelRight }),
        ],
      }),
      Skeletons.Box.X({
        className: `${fig}__meter-track`,
        kids: [
          Skeletons.Element({
            className: `${fig}__meter-fill${danger ? ` ${fig}__meter-fill--danger` : ""}`,
            style: { width: `${Math.max(0, Math.min(100, pct))}%` },
          }),
        ],
      }),
    ],
  });
}

/** Family-specific headline + meter. */
function face(fig, n) {
  const danger = /_(90)$/.test(n.trigger || "");
  const target = n.target_plan || "team";
  switch (n.family) {
    case "seats": {
      const cap = ~~n.seat_limit || 1;
      return {
        danger,
        title: LOCALE.UN_TITLE_SEATS || "Your team is growing",
        lead: (target === "business"
          ? (LOCALE.UN_LEAD_SEATS_BIZ ||
            "You've invited {0} of {1} members — almost there. Ready to bring in your whole organization?")
          : (LOCALE.UN_LEAD_SEATS_TEAM ||
            "You've invited {0} of {1} members — almost there. Ready to bring in more of your team?"))
          .format(~~n.seats_used, cap),
        meterBox: meter(
          fig,
          LOCALE.UN_METER_INVITED || "Invited",
          (LOCALE.UN_METER_SEATS || "{0} / {1} seats").format(~~n.seats_used, cap),
          (100 * ~~n.seats_used) / cap,
          danger
        ),
      };
    }
    case "age": {
      const duration = n.trigger === "age_30d"
        ? (LOCALE.UN_DURATION_MONTH || "a month")
        : (LOCALE.UN_DURATION_2W || "2 weeks");
      return {
        danger: false,
        title: (LOCALE.UN_TITLE_AGE || "You've been enjoying Drumee for {0}").format(duration),
        lead: target === "business"
          ? (LOCALE.UN_LEAD_AGE_BIZ ||
            "Your organization has been active and growing. Ready to scale without limits?")
          : target === "team"
            ? (LOCALE.UN_LEAD_AGE_TEAM ||
              "Your team has been active and growing. Ready to bring more people in?")
            : (LOCALE.UN_LEAD_AGE_PRO || "Ready to unlock more room to grow?"),
        meterBox: null,
      };
    }
    case "storage":
    default: {
      const used = filesize(n.disk_used || 0, { round: 0 });
      const limit = filesize(n.disk_limit || 0, { round: 0 });
      return {
        danger,
        // 70/80%: "growing"; 90%: "thriving — almost there" (content doc).
        title: danger
          ? (LOCALE.UN_TITLE_STORAGE_90 || "Your workspace is thriving")
          : (LOCALE.UN_TITLE_STORAGE || "Your workspace is growing"),
        lead: (danger
          ? (LOCALE.UN_LEAD_STORAGE_90 ||
            "You're using {0} of {1} — almost there. Ready to unlock more room to grow?")
          : (LOCALE.UN_LEAD_STORAGE ||
            "You're using {0} of {1}. Need more room for your files and team?"))
          .format(used, limit),
        meterBox: meter(
          fig,
          LOCALE.UN_METER_USED || "Used",
          `${used} / ${limit}`,
          n.disk_limit > 0 ? (100 * n.disk_used) / n.disk_limit : 0,
          danger
        ),
      };
    }
  }
}

module.exports = function (ui) {
  const fig = ui.fig.family;
  const n = ui.nudge();
  const target = n.target_plan || "team";
  const f = face(fig, n);

  const kids = [
    Skeletons.Button.Svg({
      className: `${fig}__close`,
      ico: "nudge-close",
      service: "upgrade-nudge-dismiss",
      uiHandler: [ui],
    }),
    Skeletons.Box.X({
      className: `${fig}__badge${f.danger ? ` ${fig}__badge--danger` : ""}`,
      // Figma: storage + seats carry the Warning triangle, the duration face a
      // CalendarDots — the only icon that differs between the three cards.
      kids: [Skeletons.Image.Svg({
        ico: n.family === "age" ? "nudge-calendar-dots" : "nudge-warning",
        className: `${fig}__badge-ico`,
      })],
    }),
    Skeletons.Note({ className: `${fig}__title`, content: f.title }),
    // The lead carries its own line break (Figma: numbers on line 1, the
    // question on line 2) — one Note per line, so the break is exact and no
    // template whitespace leaks in as pre-line would let it.
    Skeletons.Box.Y({
      className: `${fig}__lead`,
      kids: String(f.lead || "").split("\n").map((line) =>
        Skeletons.Note({ className: `${fig}__lead-line`, content: line })
      ),
    }),
  ];

  if (f.meterBox) kids.push(f.meterBox);

  kids.push(
    Skeletons.Box.Y({
      className: `${fig}__benefits`,
      kids: [
        Skeletons.Note({
          className: `${fig}__benefits-title`,
          content: (LOCALE.UN_BENEFITS_TITLE || "Upgrade to {0} and get:").format(planLabel(target)),
        }),
        ...benefitRows(target, n.family).map(([title, sub]) =>
          Skeletons.Box.X({
            className: `${fig}__benefit-row`,
            kids: [
              Skeletons.Image.Svg({ ico: "nudge-check-circle", className: `${fig}__benefit-tick` }),
              Skeletons.Box.Y({
                className: `${fig}__benefit-text`,
                kids: [
                  Skeletons.Note({ className: `${fig}__benefit-title`, content: title }),
                  Skeletons.Note({ className: `${fig}__benefit-sub`, content: sub }),
                ],
              }),
            ],
          })
        ),
      ],
    })
  );

  // The CTA needs somewhere real to go: members without billing rights
  // (libs/billing.canUpgradePlan — same gate as the sidebar's own "Upgrade
  // plan") get the nudge, per the spec, but not a button that dead-ends.
  const ctas = [];
  if (canUpgradePlan()) {
    ctas.push(
      Skeletons.Box.X({
        className: `${fig}__cta`,
        service: "upgrade-nudge-cta",
        uiHandler: [ui],
        kids: [
          Skeletons.Note({
            className: `${fig}__cta-label`,
            // click-through: without active:0 the Note swallows the click and
            // the parent Box's service never fires (project rule).
            active: 0,
            content: (LOCALE.UN_CTA || "Upgrade to {0}").format(planLabel(target)),
          }),
        ],
      })
    );
  }
  ctas.push(
    Skeletons.Box.X({
      className: `${fig}__cta ${fig}__cta--ghost`,
      service: "upgrade-nudge-dismiss",
      uiHandler: [ui],
      kids: [
        Skeletons.Note({
          className: `${fig}__cta-label`,
          active: 0,
          content: LOCALE.UN_NOT_NOW || "Not now",
        }),
      ],
    })
  );
  kids.push(Skeletons.Box.Y({ className: `${fig}__cta-stack`, kids: ctas }));

  return Skeletons.Box.Y({
    debug: __filename,
    className: `${fig}__backdrop`,
    kids: [Skeletons.Box.Y({ className: `${fig}__card`, kids })],
  });
};
