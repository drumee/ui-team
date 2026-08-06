const OverLimit = require("libs/over-limit");
const { filesize } = require("@drumee/ui-essentials");

/**
 * Lock-banner skeleton. Three faces:
 *   locked (over_limit)  red strip: what is over (live numbers), days left,
 *                        Resolve now (admins only).
 *   locked (hard_lock)   red strip, no countdown — the deadline already hit.
 *   restored             teal strip: back within limits, auto-hides.
 */
module.exports = function (ui, opt = {}) {
  const fig = ui.fig.family;

  if (opt.restored) {
    return Skeletons.Box.X({
      className: `${fig}__bar ${fig}__bar--ok`,
      kids: [
        Skeletons.Note({
          className: `${fig}__text`,
          content:
            LOCALE.OL_BANNER_RESOLVED ||
            "Back within your plan limits. Full read-write restored.",
        }),
      ],
    });
  }

  const c = OverLimit.current();
  if (!c) return null;

  const admin = OverLimit.isAdmin();
  const hard = c.state === "hard_lock";
  const parts = [];

  // What exactly is still over — refreshed on every re-evaluation, so a
  // partial fix updates the strip live ("190 GB over storage — seats
  // resolved" reads better than a frozen opening line).
  const overs = [];
  if (c.flags.storage) {
    overs.push(
      (LOCALE.OL_STORAGE_OVER || "{0} over storage")
        .format(filesize(Math.max(0, c.disk_used - c.disk_limit)))
    );
  }
  if (c.flags.seats) {
    overs.push(
      (LOCALE.OL_SEATS_OVER || "{0} members over seat limit")
        .format(Math.max(0, c.seats_used - c.seat_limit))
    );
  }

  let line;
  if (hard) {
    line = admin
      ? (LOCALE.OL_BANNER_LOCKED_ADMIN ||
        "Workspace locked — resolve the limits below to restore access.")
      : (LOCALE.OL_BANNER_LOCKED_MEMBER ||
        "Workspace locked — only the owner or an admin can restore access.");
  } else {
    line = admin
      ? (LOCALE.OL_BANNER_READONLY ||
        "Read-only — resolve to continue.")
      : (LOCALE.OL_BANNER_READONLY_MEMBER ||
        "Read-only — the workspace is over its plan limits. An admin is resolving it.");
  }

  parts.push(
    Skeletons.Note({ className: `${fig}__text ${fig}__text--strong`, content: line }),
    Skeletons.Note({ className: `${fig}__text`, content: overs.join(" · ") })
  );

  if (!hard) {
    const days = OverLimit.daysLeft();
    parts.push(
      Skeletons.Note({
        className: `${fig}__days`,
        content: (LOCALE.OL_BANNER_DAYS_LEFT || "{0} days left.").format(days),
      })
    );
  }

  if (admin) {
    parts.push(
      Skeletons.Note({
        className: `${fig}__cta`,
        content: LOCALE.OL_RESOLVE_NOW || "Resolve now",
        service: "over-limit-banner-resolve",
        uiHandler: [ui],
      })
    );
  }

  return Skeletons.Box.X({
    debug: __filename,
    className: `${fig}__bar`,
    kids: parts,
  });
};
