// Per-access-event table for the v2 "View access list" (Figma 2.2.3):
// avatar · Email · Access Time · Duration · ⊖. Fed by
// SERVICE.secure_share.list_access_events — one row per visit, so the same
// person appears once per open.
//
// This is the ORIGINAL email-keyed log, restored on Lexis's request. It briefly
// carried one row per LINK instead (Shared with / Last opened / Opens), which
// matched what revoking actually does — see the archive memory for why that was
// built and how to bring it back; the SCSS for both layouts is still in skin/.

// The Action column is hidden for now: Lexis is redesigning where the revoke
// affordance lives. The column is kept behind this flag — with its header cell,
// so header and rows can never disagree on the column count — and the ⊖ is wired
// to the panel's live revoke path, so flipping this to `true` restores a working
// button rather than a dead one.
//
// While it is false a created link can only be revoked from the Get-link result
// row, in the same session (the SHARED LINKS section stays hidden too). That is a
// deliberate product decision, not an oversight.
const SHOW_REVOKE_COLUMN = false;

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
      ...(SHOW_REVOKE_COLUMN
        ? [Skeletons.Note({ className: `${pfx}__events-col col-action`, content: LOCALE.SECURE_SHARE_COL_ACTION })]
        : []),
    ]
  });

  // Public shares are excluded server-side by secure_share_list_access_events
  // (it returns events only for gated tokens, plus IDENTIFIED opens of a public
  // link), so every row here is a real secure-share access — render them all, no
  // client-side visitor filtering.
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
    // The server resolves recipient_email from actor_id for signed-in opens of a
    // link with no email gate, so an unlabelled row really is an unattributable
    // one.
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
        ...(SHOW_REVOKE_COLUMN ? [
          Skeletons.Box.X({
            className : `${pfx}__events-cell col-action`,
            // ⊖ revokes the share LINK (token) this visit came through, cutting
            // everyone who used it — same effect, and the same 'revoke-secure-share'
            // handler, as the Get-link row's Revoke. token_id from the access-event
            // SP IS the share id secure_share_revoke matches on.
            kids      : r.token_id ? [
              Skeletons.Button.Svg({
                ico       : 'ban',
                className : `${pfx}__events-revoke`,
                service   : 'revoke-secure-share',
                tooltips  : LOCALE.SECURE_SHARE_REVOKE_RECIPIENT,
                token     : r.token_id,
                uiHandler : [_ui_],
              })
            ] : []
          })
        ] : []),
      ]
    });
  });

  return Skeletons.Box.Y({
    className : `${pfx}__events-table`,
    kids      : [header, ...rowKids]
  });
};

module.exports = __skl_secure_share_access_events;
