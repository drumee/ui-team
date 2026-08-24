/**
 * Nudge Lab skeleton — state panel + one button per scenario, grouped the
 * way testers think: Storage / Seats / Age / Plan / Gate. Dev-only tool
 * (devel module), so the strings stay English literals behind LOCALE
 * fallbacks like the other devel pages.
 */
const { filesize } = require("@drumee/ui-essentials");

const GROUPS = [
  {
    title: "Storage",
    hint: "sets your usage to a % of the plan disk, then Reset + open a fresh desk tab",
    buttons: [
      ["storage_70", "70% (amber)"],
      ["storage_80", "80% (amber)"],
      ["storage_90", "90% (red)"],
      ["storage_low", "Below threshold"],
    ],
  },
  {
    title: "Seats",
    hint: "org: squeezes the seat cap around the current headcount · personal: adds 3 lab members (cap 3)",
    buttons: [
      ["seats_70", "≈75% (amber)"],
      ["seats_90", "100% (red)"],
      ["seats_off", "Back to roomy"],
    ],
  },
  {
    title: "Workspace age",
    hint: "fakes the creation date; Restore puts the real date back",
    buttons: [
      ["age_14d", "2 weeks old"],
      ["age_30d", "1 month old"],
      ["age_reset", "Restore real age"],
    ],
  },
  {
    title: "Plan",
    hint: "org: Team ⇄ Business · personal: Free ⇄ Pro — a plan change re-arms every threshold",
    buttons: [
      ["plan_up", "Upgrade plan"],
      ["plan_restore", "Restore plan"],
    ],
  },
  {
    title: "Gate",
    hint: "New day lifts today's 1-popup cap but keeps what you've seen; Reset wipes everything",
    buttons: [
      ["new_day", "New day (lift cap)"],
      ["reset", "Reset popups"],
      ["cleanup", "Cleanup (baseline)"],
    ],
  },
];

function stateRows(fig, s) {
  const rows = [
    ["Scope", s.scope === "org" ? `Organisation (${s.id})` : `Personal account (${s.uid})`],
    ["Plan", s.plan || "—"],
    [
      "Storage",
      s.disk_limit
        ? `${filesize(s.disk_used || 0, { round: 1 })} / ${filesize(s.disk_limit, { round: 0 })}  (${s.disk_pct}%)`
        : "—",
    ],
    ["Seats", s.seat_limit ? `${s.seats_used} / ${s.seat_limit}` : `${s.seats_used} / unlimited`],
    ["Age", `${s.age_days} days`],
  ];
  const b = s.block;
  rows.push([
    "Seen",
    b && b.seen ? Object.keys(b.seen).join(", ") : "nothing yet",
  ]);
  rows.push([
    "Daily cap",
    b && b.last_shown && b.last_shown[s.uid] ? `used on ${b.last_shown[s.uid]} (UTC)` : "free today",
  ]);
  return rows.map(([k, v]) =>
    Skeletons.Box.X({
      className: `${fig}__state-row`,
      kids: [
        Skeletons.Note({ className: `${fig}__state-key`, content: k }),
        Skeletons.Note({ className: `${fig}__state-val`, content: String(v) }),
      ],
    })
  );
}

module.exports = function (ui) {
  const fig = ui.fig.family;
  const s = ui.state();

  if (s && ~~s.enabled === 0) {
    return Skeletons.Box.Y({
      className: `${fig}__wrap`,
      kids: [
        Skeletons.Note({ className: `${fig}__title`, content: "Nudge Lab" }),
        Skeletons.Note({
          className: `${fig}__hint`,
          content: "Disabled here — the nudge_lab flag is off on this server.",
        }),
      ],
    });
  }

  const kids = [
    Skeletons.Note({ className: `${fig}__title`, content: "Nudge Lab — upgrade popup scenarios" }),
    Skeletons.Note({
      className: `${fig}__lead`,
      content:
        "Pick a scenario for YOUR account, hit Reset if you want the popup again, then open a fresh desk tab and wait ~15s. One popup per person per day (UTC) — New day lifts it.",
    }),
    s.error
      ? Skeletons.Note({ className: `${fig}__error`, content: String(s.error) })
      : null,
    Skeletons.Box.Y({ className: `${fig}__state`, kids: stateRows(fig, s) }),
  ];

  for (const g of GROUPS) {
    kids.push(
      Skeletons.Box.Y({
        className: `${fig}__group`,
        kids: [
          Skeletons.Note({ className: `${fig}__group-title`, content: g.title }),
          Skeletons.Note({ className: `${fig}__group-hint`, content: g.hint }),
          Skeletons.Box.X({
            className: `${fig}__buttons`,
            kids: g.buttons.map(([name, label]) =>
              Skeletons.Box.X({
                className: `${fig}__btn${ui.busy() ? ` ${fig}__btn--busy` : ""}`,
                service: "nudge-lab-scenario",
                scenario: name,
                uiHandler: [ui],
                kids: [
                  Skeletons.Note({ className: `${fig}__btn-label`, active: 0, content: label }),
                ],
              })
            ),
          }),
        ],
      })
    );
  }

  kids.push(
    Skeletons.Box.X({
      className: `${fig}__footer`,
      kids: [
        Skeletons.Box.X({
          className: `${fig}__btn ${fig}__btn--primary`,
          service: "nudge-lab-open-desk",
          uiHandler: [ui],
          kids: [Skeletons.Note({ className: `${fig}__btn-label`, active: 0, content: "Open desk (new tab)" })],
        }),
        Skeletons.Box.X({
          className: `${fig}__btn`,
          service: "nudge-lab-refresh",
          uiHandler: [ui],
          kids: [Skeletons.Note({ className: `${fig}__btn-label`, active: 0, content: "Refresh state" })],
        }),
      ],
    })
  );

  return Skeletons.Box.Y({ debug: __filename, className: `${fig}__wrap`, kids });
};
