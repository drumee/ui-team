// Access table of the v2 sharing panel — one row per LINK.
//
// It used to be one row per access EVENT: the same person appeared once per
// visit, anonymous hits showed as unactionable "Public" rows, and the ⊖ on a row
// revoked the whole LINK that visit came through — which other rows were often
// sharing. Acting on one row silently cut other people while the row itself
// stayed on screen, so a revoke that had in fact worked read as a no-op.
//
// A link is what the sender creates and what revoking acts on, so the link is
// the row, with its visits counted in the Opens column. Links nobody has opened
// are listed too — with the event list they had no row at all, so once the
// shared-links section was hidden they could not be revoked from anywhere.
//
// Who opened a given link (and revoking one of them individually) belongs to the
// per-link popup, which the server already backs via secure_share.revoke_email.

// Who a link admits, from the v2 allowed_emails array; legacy rows fall back to
// recipient_email. A "@domain" entry admits anyone at that domain.
const __linkLabel = function(row) {
  let emails = null;
  try {
    emails = row.allowed_emails
      ? (typeof row.allowed_emails === 'string' ? JSON.parse(row.allowed_emails) : row.allowed_emails)
      : null;
  } catch (e) {
    emails = null;
  }
  if (Array.isArray(emails) && emails.length) {
    const pretty = emails
      .map(e => String(e || '').trim())
      .filter(Boolean)
      .map(e => e.startsWith('@') ? `${LOCALE.SECURE_SHARE_ANYONE_AT} ${e}` : e);
    if (!pretty.length)      return LOCALE.SECURE_SHARE_PUBLIC_LINK;
    if (pretty.length === 1) return pretty[0];
    return `${pretty[0]} +${pretty.length - 1}`;
  }
  if (row.recipient_email) return row.recipient_email;
  return LOCALE.SECURE_SHARE_PUBLIC_LINK;
};

const __skl_secure_share_access_events = function(_ui_, links, eventsByToken) {
  const pfx = _ui_.fig.family;

  const header = Skeletons.Box.X({
    className : `${pfx}__events-cols`,
    kids      : [
      Skeletons.Note({ className: `${pfx}__events-col col-email`,    content: LOCALE.SECURE_SHARE_COL_SHARED_WITH }),
      Skeletons.Note({ className: `${pfx}__events-col col-time`,     content: LOCALE.SECURE_SHARE_COL_LAST_OPENED }),
      Skeletons.Note({ className: `${pfx}__events-col col-duration`, content: LOCALE.SECURE_SHARE_COL_OPENS }),
      Skeletons.Note({ className: `${pfx}__events-col col-action`,   content: LOCALE.SECURE_SHARE_COL_ACTION }),
    ]
  });

  if (!Array.isArray(links) || !links.length) {
    return Skeletons.Box.Y({
      className : `${pfx}__events-table`,
      kids      : [
        header,
        Skeletons.Note({ className: `${pfx}__events-empty`, content: LOCALE.SECURE_SHARE_NO_SHARES })
      ]
    });
  }

  const rowKids = links.map((row) => {
    const token = row.id;
    const opens = (eventsByToken && eventsByToken[token]) || [];
    // `status` is computed by secure_share_list (active / revoked / expired).
    const isActive    = row.status === 'active';
    const statusLabel = row.revoked_at
      ? LOCALE.SECURE_SHARE_STATUS_REVOKED
      : LOCALE.SECURE_SHARE_STATUS_EXPIRED;

    // Last open comes from the visit log; last_accessed on the token can predate
    // the per-visit events, so prefer the events and fall back to the token.
    const lastSeen = opens.reduce((max, o) => Math.max(max, o.last_seen_at || 0), 0)
      || row.last_accessed || 0;
    const timeStr  = lastSeen
      ? Dayjs.unix(lastSeen).format('MMM D, h:mm A')
      : LOCALE.SECURE_SHARE_NEVER_ACCESSED;

    return Skeletons.Box.X({
      className : `${pfx}__events-row`,
      dataset   : { token },
      kids      : [
        Skeletons.Box.X({
          className : `${pfx}__events-cell col-email`,
          kids      : [
            Skeletons.Image.Svg({ className: `${pfx}__events-link-icon`, ico: 'apps-link-simple' }),
            Skeletons.Note({ className: `${pfx}__events-email`, content: __linkLabel(row) })
          ]
        }),
        Skeletons.Note({ className: `${pfx}__events-cell col-time`,     content: timeStr }),
        Skeletons.Note({ className: `${pfx}__events-cell col-duration`, content: `${opens.length}` }),
        Skeletons.Box.X({
          className : `${pfx}__events-cell col-action`,
          // Only a live link can be revoked; a revoked or expired one reports its
          // state instead of offering an action that has already been taken.
          kids      : isActive ? [
            Skeletons.Box.X({
              className : `${pfx}__events-revoke-btn button`,
              service   : 'revoke-secure-share',
              token     : token,
              uiHandler : [_ui_],
              kidsOpt   : { active: 0 },
              kids      : [Skeletons.Note({ content: LOCALE.SECURE_SHARE_REVOKE })]
            })
          ] : [
            Skeletons.Note({ className: `${pfx}__events-revoked`, content: statusLabel })
          ]
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
