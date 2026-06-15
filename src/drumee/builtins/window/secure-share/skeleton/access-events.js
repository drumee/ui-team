
// Per-access-event table for the v2 "View access list" (Figma 2.2.3):
// avatar · Email · Access Time · Duration · ⊖ (revoke this recipient's access).
// Fed by SERVICE.secure_share.list_access_events — one row per visit.

// Compact "2h 10m" / "45m" / "30s" duration from a second count (matches Figma).
const __fmtDuration = function(secs) {
  secs = Math.max(0, parseInt(secs, 10) || 0);
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h && m) return `${h}h ${m}m`;
  if (h)      return `${h}h`;
  if (m)      return `${m}m`;
  return `${secs}s`;
};

const __skl_secure_share_access_events = function(_ui_, rows) {
  const pfx = _ui_.fig.family;

  const header = Skeletons.Box.X({
    className : `${pfx}__events-cols`,
    kids      : [
      Skeletons.Note({ className: `${pfx}__events-col col-email`,    content: LOCALE.EMAIL }),
      Skeletons.Note({ className: `${pfx}__events-col col-time`,     content: LOCALE.SECURE_SHARE_COL_ACCESS_TIME }),
      Skeletons.Note({ className: `${pfx}__events-col col-duration`, content: LOCALE.SECURE_SHARE_COL_DURATION }),
      Skeletons.Note({ className: `${pfx}__events-col col-action`,   content: LOCALE.SECURE_SHARE_COL_ACTION }),
    ]
  });

  // Public shares are excluded server-side by secure_share_list_access_events
  // (it returns events only for gated/secure tokens), so every row here is a real
  // secure-share access — render them all, no client-side visitor filtering.
  if (!Array.isArray(rows) || !rows.length) {
    return Skeletons.Box.Y({
      className : `${pfx}__events-table`,
      kids      : [
        header,
        Skeletons.Note({ className: `${pfx}__events-empty`, content: LOCALE.SECURE_SHARE_NO_ACCESS_EVENTS })
      ]
    });
  }

  const rowKids = rows.map((r) => {
    const email   = r.recipient_email || LOCALE.SECURE_SHARE_PUBLIC;
    const timeStr = r.entered_at ? Dayjs.unix(r.entered_at).format('MMM D, h:mm A') : '';
    const durStr  = __fmtDuration(r.duration);

    return Skeletons.Box.X({
      className : `${pfx}__events-row`,
      kids      : [
        Skeletons.Box.X({
          className : `${pfx}__events-cell col-email`,
          kids      : [
            Skeletons.Avatar('default', `${pfx}__events-avatar`, email),
            Skeletons.Note({ className: `${pfx}__events-email`, content: email })
          ]
        }),
        Skeletons.Note({ className: `${pfx}__events-cell col-time`,     content: timeStr }),
        Skeletons.Note({ className: `${pfx}__events-cell col-duration`, content: durStr }),
        Skeletons.Box.X({
          className : `${pfx}__events-cell col-action`,
          // ⊖ revokes the share link (token) this recipient came through — same
          // effect as the Revoke button in the Shared-links list. token_id from the
          // access-event SP IS the share id that secure_share_revoke matches on.
          kids      : r.token_id ? [
            Skeletons.Button.Svg({
              ico       : 'ban',
              className : `${pfx}__events-revoke`,
              service   : 'revoke-access-recipient',
              tooltips  : LOCALE.SECURE_SHARE_REVOKE_RECIPIENT,
              token     : r.token_id,
              uiHandler : [_ui_],
            })
          ] : []
        })
      ]
    });
  });

  return Skeletons.Box.Y({
    className : `${pfx}__events-table`,
    kids      : [header, ...rowKids]
  });
};

module.exports = __skl_secure_share_access_events;
