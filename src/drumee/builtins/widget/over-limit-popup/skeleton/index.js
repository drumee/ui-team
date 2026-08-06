const OverLimit = require("libs/over-limit");
const { filesize } = require("@drumee/ui-essentials");

/**
 * Over-limit popup skeleton — three faces (see ../index.js):
 * admin/over_limit, admin/hard_lock, member/hard_lock.
 *
 * Every TRUE flag gets its own violation row with the exact overage number —
 * never a merged sentence: the design's central rule is that the two flags
 * are independent, and the copy has to make that visible.
 */

function planLabel(plan) {
  const p = String(plan || "");
  return p ? p.charAt(0).toUpperCase() + p.slice(1) : "";
}

function violationRows(ui, c) {
  const fig = ui.fig.family;
  const rows = [];
  const plan = planLabel(c.plan);
  if (c.flags.storage) {
    rows.push(
      Skeletons.Box.Y({
        className: `${fig}__violation`,
        kids: [
          Skeletons.Note({
            className: `${fig}__violation-title`,
            content: (LOCALE.OL_STORAGE_OVER || "{0} over storage")
              .format(filesize(Math.max(0, c.disk_used - c.disk_limit))),
          }),
          Skeletons.Note({
            className: `${fig}__violation-sub`,
            content: (LOCALE.OL_STORAGE_SUB || "{0} used · {1} limit is {2}")
              .format(filesize(c.disk_used), plan, filesize(c.disk_limit)),
          }),
        ],
      })
    );
  }
  if (c.flags.seats) {
    rows.push(
      Skeletons.Box.Y({
        className: `${fig}__violation`,
        kids: [
          Skeletons.Note({
            className: `${fig}__violation-title`,
            content: (LOCALE.OL_SEATS_OVER || "{0} members over seat limit")
              .format(Math.max(0, c.seats_used - c.seat_limit)),
          }),
          Skeletons.Note({
            className: `${fig}__violation-sub`,
            content: (LOCALE.OL_SEATS_SUB || "{0} members · {1} limit is {2}")
              .format(c.seats_used, plan, c.seat_limit),
          }),
        ],
      })
    );
  }
  return rows;
}

module.exports = function (ui) {
  const fig = ui.fig.family;
  const c = OverLimit.current();
  if (!c) return Skeletons.Box.Y({ className: `${fig}__backdrop`, kids: [] });

  const admin = OverLimit.isAdmin();
  const hard = c.state === "hard_lock";
  const both = c.flags.storage && c.flags.seats;

  const kids = [];

  // ── Member wall (hard_lock, non-admin) — nothing to resolve here ──
  if (hard && !admin) {
    kids.push(
      Skeletons.Note({
        className: `${fig}__title`,
        content: LOCALE.OL_TITLE_LOCKED || "Workspace locked",
      }),
      Skeletons.Note({
        className: `${fig}__lead`,
        content:
          LOCALE.OL_LEAD_MEMBER_LOCKED ||
          "This workspace is locked because it exceeds its plan limits. Only the workspace owner or an admin can resolve it.",
      }),
      Skeletons.Box.Y({
        className: `${fig}__cta-stack`,
        kids: [
          Skeletons.Box.X({
            className: `${fig}__cta ${fig}__cta--ghost`,
            service: "over-limit-signout",
            uiHandler: [ui],
            kids: [
              Skeletons.Note({
                className: `${fig}__cta-label`,
                content: LOCALE.SIGN_OUT || LOCALE.LOGOUT || "Sign out",
              }),
            ],
          }),
        ],
      })
    );
  } else {
    // ── Owner/Admin faces ──
    kids.push(
      Skeletons.Note({
        className: `${fig}__title`,
        content: hard
          ? LOCALE.OL_TITLE_LOCKED || "Workspace locked"
          : LOCALE.OL_TITLE_ACTION || "Plan changed — action needed",
      }),
      Skeletons.Note({
        className: `${fig}__lead`,
        content: hard
          ? (LOCALE.OL_LEAD_LOCKED ||
            "The grace period has ended. The workspace stays locked until it is back within its plan limits.")
          : (both
            ? (LOCALE.OL_LEAD_TWO || "Your workspace is over two limits on the {0} plan.")
            : (LOCALE.OL_LEAD_ONE || "Your workspace is over a limit on the {0} plan."))
            .format(planLabel(c.plan)),
      }),
      ...violationRows(ui, c)
    );

    // Trash reality check — deleting alone does not free quota here, and the
    // owner needs to know that before they "resolve" into confusion.
    if (c.flags.storage) {
      kids.push(
        Skeletons.Note({
          className: `${fig}__hint`,
          content:
            LOCALE.OL_TRASH_HINT ||
            "Deleted files keep counting until you empty the trash.",
        })
      );
    }

    const ctas = [
      Skeletons.Box.X({
        className: `${fig}__cta`,
        service: "over-limit-resolve",
        uiHandler: [ui],
        kids: [
          Skeletons.Note({
            className: `${fig}__cta-label`,
            content: LOCALE.OL_RESOLVE_NOW || "Resolve now",
          }),
        ],
      }),
    ];
    // "Remind me later" exists only while grace is running — hard_lock is
    // non-dismissible by design.
    if (!hard) {
      ctas.push(
        Skeletons.Box.X({
          className: `${fig}__cta ${fig}__cta--ghost`,
          service: "over-limit-later",
          uiHandler: [ui],
          kids: [
            Skeletons.Note({
              className: `${fig}__cta-label`,
              content: LOCALE.OL_REMIND_LATER || "Remind me later",
            }),
          ],
        })
      );
    }
    kids.push(Skeletons.Box.Y({ className: `${fig}__cta-stack`, kids: ctas }));

    kids.push(
      Skeletons.Note({
        className: `${fig}__fineprint`,
        content:
          LOCALE.OL_FINEPRINT ||
          "Nothing is deleted automatically. You choose what to remove.",
      })
    );
  }

  return Skeletons.Box.Y({
    debug: __filename,
    className: `${fig}__backdrop`,
    kids: [
      Skeletons.Box.Y({
        className: `${fig}__card`,
        kids,
      }),
    ],
  });
};
