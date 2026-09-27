/**
 * Upgrade-nudge popup skeleton — the Figma "Upgrade Trigger" card, three
 * faces (storage / seats / age) on one 398px sheet: warning badge, centered
 * headline, family-specific meter, "Upgrade to X and get:" benefit list,
 * full-width brand CTA, "Not now".
 *
 * Copy for the Business route follows the Drumee 2.0 Figma (file
 * 3LDZYKjL7uHpXHdXKwAXxZ, node 1110:3754 — "trigger" = seats at 9/10,
 * "storage 70%"); the Team and Pro routes keep the content-doc copy the
 * designer has not redrawn. LOCALE keys first, the Figma strings as
 * fallbacks, exactly the over-limit-popup arrangement, so the words can
 * change without a deploy. A `**run**` inside a lead line renders bold
 * (Figma: "You're using **70 GB of 100 GB.**").
 */
const { canUpgradePlan } = require("libs/billing");
const { filesize } = require("@drumee/ui-essentials");

function planLabel(plan) {
  const p = String(plan || "");
  return p ? p.charAt(0).toUpperCase() + p.slice(1) : "";
}

/**
 * Benefit rows per plan being sold. Business = the three Drumee 2.0 rows:
 * the storage face leads with storage, the seats/duration faces with
 * members; the seats face carries its own sub-lines and sells the admin
 * panel + audit logs where the others sell audit permissions. Team and Pro
 * keep the "Upgrade Popup Templates" doc rows (storage face leads with
 * storage, the others with members).
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
      if (seats) {
        return [
          [LOCALE.UN_B_BIZ_MEMBERS || "Unlimited members", LOCALE.UN_B_BIZ_MEMBERS_SEATS_SUB || "Invite without checking a counter"],
          [LOCALE.UN_B_BIZ_STORAGE || "1 TB storage", LOCALE.UN_B_BIZ_STORAGE_SEATS_SUB || "Room for the team you're building"],
          [LOCALE.UN_B_BIZ_CONSOLE || "Admin panel + audit logs", LOCALE.UN_B_BIZ_CONSOLE_SUB || "Track who has access to what"],
        ];
      }
      const storage = [LOCALE.UN_B_BIZ_STORAGE || "1 TB storage", LOCALE.UN_B_BIZ_STORAGE_SUB || "10× more room to grow"];
      const members = [LOCALE.UN_B_BIZ_MEMBERS || "Unlimited members", LOCALE.UN_B_BIZ_MEMBERS_SUB || "Bring your whole team in"];
      const audit = [LOCALE.UN_B_BIZ_AUDIT || "Audit permissions", LOCALE.UN_B_BIZ_AUDIT_SUB || "More control over workspace access"];
      return leadMembers ? [members, storage, audit] : [storage, members, audit];
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

/**
 * Family-specific headline, lead and meter; a face may also bring its own CTA
 * label and opt out of the benefits heading (`benefitsTitle: false`).
 */
function face(fig, n) {
  const danger = /_(90)$/.test(n.trigger || "");
  const target = n.target_plan || "team";
  switch (n.family) {
    case "seats": {
      const cap = ~~n.seat_limit || 1;
      const used = ~~n.seats_used;
      const left = cap - used;
      // Figma 2.0 seats card, the same shape for every route: "almost out of
      // seats", the seats left, what the next tier does about the cap, the
      // generic CTA, no benefits heading. Only line 2 depends on the tier.
      const line1 = left > 0
        ? (left === 1
          ? (LOCALE.UN_SEATS_LEFT_ONE || "Only 1 seat left.")
          : (LOCALE.UN_SEATS_LEFT || "Only {0} seats left.").format(left))
        : (LOCALE.UN_SEATS_LEFT_NONE || "All {0} seats are taken.").format(cap);
      const line2 = target === "business"
        ? (LOCALE.UN_SEATS_NEXT_BIZ || "Business removes the seat cap entirely.")
        : (LOCALE.UN_SEATS_NEXT_TEAM || "Team raises the cap to 10 members.");
      return {
        danger,
        title: LOCALE.UN_TITLE_SEATS || "You're almost out of seats",
        lead: `${line1}\n${line2}`,
        meterBox: meter(
          fig,
          LOCALE.UN_METER_INVITED || "Invited",
          (LOCALE.UN_METER_SEATS || "{0} / {1} seats").format(used, cap),
          (100 * used) / cap,
          danger
        ),
        benefitsTitle: false,
        cta: LOCALE.UN_CTA_SEATS || "Upgrade your plan",
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
        // Drumee 2.0 draws ONE storage card for every threshold — the content
        // doc's 90% "thriving / almost there" variant is gone; only the badge
        // and the meter turn red. Numbers in bold: the `**` run, see leadLine().
        title: LOCALE.UN_TITLE_STORAGE || "Your workspace is growing",
        lead: (LOCALE.UN_LEAD_STORAGE ||
          "You're using **{0} of {1}.**\nNeed more room for your files and team?")
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

/**
 * One lead line → a centred row of Notes, a `**run**` rendered bold. Segment
 * edges are trimmed and the word gap re-added as a margin (`--gap`) so the
 * spacing does not depend on how a Note treats a trailing space.
 */
function leadLine(fig, line) {
  const raw = String(line).split(/\*\*(.+?)\*\*/);
  const kids = [];
  let gapPending = false;
  raw.forEach((seg, i) => {
    if (!seg) return;
    const gap = gapPending || /^\s/.test(seg);
    const text = seg.trim();
    gapPending = /\s$/.test(seg);
    if (!text) return;
    kids.push(Skeletons.Note({
      className: `${fig}__lead-text${i % 2 ? ` ${fig}__lead-strong` : ""}${gap && kids.length ? ` ${fig}__lead-text--gap` : ""}`,
      content: text,
    }));
  });
  return Skeletons.Box.X({ className: `${fig}__lead-line`, kids });
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
    // question on line 2) — one row per line, so the break is exact and no
    // template whitespace leaks in as pre-line would let it.
    Skeletons.Box.Y({
      className: `${fig}__lead`,
      kids: String(f.lead || "").split("\n").map((line) => leadLine(fig, line)),
    }),
  ];

  if (f.meterBox) kids.push(f.meterBox);

  kids.push(
    Skeletons.Box.Y({
      className: `${fig}__benefits`,
      kids: [
        ...(f.benefitsTitle === false ? [] : [Skeletons.Note({
          className: `${fig}__benefits-title`,
          content: (LOCALE.UN_BENEFITS_TITLE || "Upgrade to {0} and get:").format(planLabel(target)),
        })]),
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
            content: f.cta || (LOCALE.UN_CTA || "Upgrade to {0}").format(planLabel(target)),
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
