const OverLimit = require("libs/over-limit");
const { needsAdminConsoleUpgrade } = require("libs/billing");
const { filesize } = require("@drumee/ui-essentials");

/**
 * Over-limit popup skeleton — three faces (see ../index.js):
 * owner/over_limit, owner/hard_lock, and non-owner (either state: the
 * numbers, "contact the owner at <email>", Close).
 *
 * Every TRUE flag gets its own violation row with the exact overage number —
 * never a merged sentence: the design's central rule is that the two flags
 * are independent, and the copy has to make that visible.
 */

function planLabel(plan) {
  const p = String(plan || "");
  return p ? p.charAt(0).toUpperCase() + p.slice(1) : "";
}

/**
 * Where somebody can actually go to shed bytes.
 *
 * The storage row used to state the overage and stop there: "Resolve now"
 * navigated for SEATS only, so a storage-only violation closed the popup and
 * left the reader to find the right screen by themselves (reported
 * 2026-08-10, "thiếu case storage over").
 *
 * Three destinations, because freeing space genuinely takes three different
 * screens: delete on Home, then EMPTY the trash — deleted files keep counting
 * until you do, which is what the hint under the rows has always said — and,
 * where the plan has it, the console's Storage tab, which breaks usage down
 * per workspace and per user. That last one is dropped for Free/Pro rather
 * than shown and refused: those plans sit below the console
 * (libs/billing.needsAdminConsoleUpgrade), the same rule the seat row uses.
 */
function storageDestinations(ui, fig) {
  const opts = [
    { service: "over-limit-goto-home", label: LOCALE.OL_GOTO_HOME || "Open Home" },
    { service: "over-limit-goto-trash", label: LOCALE.OL_GOTO_TRASH || "Empty trash" },
  ];
  if (!needsAdminConsoleUpgrade()) {
    opts.push({
      service: "over-limit-goto-storage",
      label: LOCALE.OL_GOTO_STORAGE || "Storage console",
    });
  }
  return Skeletons.Box.X({
    className: `${fig}__destinations`,
    kids: opts.map((o) =>
      Skeletons.Box.X({
        className: `${fig}__destination`,
        service: o.service,
        uiHandler: [ui],
        kids: [
          Skeletons.Note({
            className: `${fig}__destination-label`,
            // click-through: without active:0 the Note swallows the click and
            // the parent Box's service never fires (project rule).
            active: 0,
            content: o.label,
          }),
        ],
      })
    ),
  });
}

function violationRows(ui, c, owner = true) {
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
          // Home / Trash / console are the OWNER's way out; a non-owner is
          // told whom to contact instead (see the non-owner face).
          owner ? storageDestinations(ui, fig) : null,
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
          // Free and Pro sit below the Admin Console, and downgrading to one
          // of them is exactly how an account lands over its seat limit — so
          // the usual "Resolve now takes you to the members page" is not true
          // for the very people reading this. Say where the members actually
          // are instead of sending them to a page their plan does not have.
          owner && needsAdminConsoleUpgrade()
            ? Skeletons.Note({
              className: `${fig}__hint`,
              content:
                LOCALE.OL_SEATS_NO_CONSOLE ||
                "Your plan has no Admin Console. Open each workspace and remove members from its own member list.",
            })
            : null,
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

  const owner = OverLimit.isOwner();
  const hard = c.state === "hard_lock";
  const both = c.flags.storage && c.flags.seats;

  const kids = [];

  // ── Not the owner (admins included) — nothing to resolve from here ──
  // The numbers, whom to contact, and a Close. Resolve / Remind me later are
  // the owner's alone (2026-11-06).
  if (!owner) {
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
          ? (LOCALE.OL_LEAD_NONOWNER_LOCKED ||
            "This workspace is locked because it exceeds its plan limits. Only the workspace owner can resolve it.")
          : (LOCALE.OL_LEAD_MEMBER ||
            "This workspace is over its plan limits and is read-only until the owner resolves it."),
      }),
      ...violationRows(ui, c, false),
      Skeletons.Note({
        className: `${fig}__contact`,
        content: OverLimit.contactOwnerText(),
      }),
      Skeletons.Box.Y({
        className: `${fig}__cta-stack`,
        kids: [
          Skeletons.Box.X({
            className: `${fig}__cta ${fig}__cta--ghost`,
            service: "over-limit-close",
            uiHandler: [ui],
            kids: [
              Skeletons.Note({
                className: `${fig}__cta-label`,
                // click-through: without active:0 the Note swallows the click
                // and the parent Box's service never fires (project rule).
                active: 0,
                content: LOCALE.CLOSE || "Close",
              }),
            ],
          }),
        ],
      })
    );
  } else {
    // ── Owner faces ──
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
            active: 0,
            content: LOCALE.OL_RESOLVE_NOW || "Resolve now",
          }),
        ],
      }),
    ];
    // The owner always gets both buttons (2026-11-06 rule: owner → "Resolve
    // now" + "Remind me later"; anyone else → contact line + Close). Under
    // hard_lock the snooze only closes the card for now: the boot rule
    // re-opens it on every load regardless (desk _maybeShowOverLimit).
    {
      ctas.push(
        Skeletons.Box.X({
          className: `${fig}__cta ${fig}__cta--ghost`,
          service: "over-limit-later",
          uiHandler: [ui],
          kids: [
            Skeletons.Note({
              className: `${fig}__cta-label`,
              active: 0,
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
