
const __skl_secure_share_row = function(_ui_, row) {
  const pfx      = `${_ui_.fig.family}`;
  const isActive = !row.revoked_at && (!row.expiry_time || row.expiry_time > Date.now() / 1000);

  // Recipient display — v2 uses allowed_emails array; v1 legacy uses recipient_email
  let recipientText;
  try {
    const emails = row.allowed_emails
      ? (typeof row.allowed_emails === 'string' ? JSON.parse(row.allowed_emails) : row.allowed_emails)
      : null;
    if (Array.isArray(emails) && emails.length > 0) {
      recipientText = emails.length === 1
        ? emails[0]
        : `${emails.length} ${LOCALE.SECURE_SHARE_RECIPIENTS}`;
    } else {
      recipientText = row.recipient_email || LOCALE.SECURE_SHARE_PUBLIC;
    }
  } catch (e) {
    recipientText = row.recipient_email || LOCALE.SECURE_SHARE_PUBLIC;
  }

  // Permission level badge
  const PERM_LABELS = {
    can_view    : LOCALE.SECURE_SHARE_CAN_VIEW,
    can_download: LOCALE.SECURE_SHARE_CAN_DOWNLOAD,
    can_chat    : LOCALE.SECURE_SHARE_CAN_CHAT,
    can_edit    : LOCALE.SECURE_SHARE_CAN_EDIT,
  };
  const permLabel = PERM_LABELS[row.permission_level] || LOCALE.SECURE_SHARE_CAN_VIEW;

  const statusLabel = row.revoked_at
    ? LOCALE.SECURE_SHARE_STATUS_REVOKED
    : (!isActive ? LOCALE.SECURE_SHARE_STATUS_EXPIRED : LOCALE.SECURE_SHARE_ACTIVE);

  const lastAccessedStr = row.last_accessed
    ? Dayjs.unix(row.last_accessed).fromNow()
    : LOCALE.SECURE_SHARE_NEVER_ACCESSED;
  const expiryStr = row.expiry_time
    ? Dayjs.unix(row.expiry_time).fromNow()
    : LOCALE.SECURE_SHARE_NO_EXPIRY;

  const actions = [];
  if (isActive && row.link) {
    actions.push(
      Skeletons.Box.X({
        className : `${pfx}__share-copy button`,
        service   : 'copy-secure-link',
        link      : row.link,
        uiHandler : [_ui_],
        kidsOpt   : { active: 0 },
        kids      : [Skeletons.Note({ content: LOCALE.COPY })]
      })
    );
  }
  if (isActive) {
    actions.push(
      Skeletons.Box.X({
        className : `${pfx}__share-revoke button`,
        service   : 'revoke-secure-share',
        token     : row.id,
        uiHandler : [_ui_],
        kidsOpt   : { active: 0 },
        kids      : [Skeletons.Note({ content: LOCALE.SECURE_SHARE_REVOKE })]
      })
    );
  }

  const rowKids = [
    Skeletons.Box.Y({
      className : `${pfx}__share-info`,
      kids      : [
        Skeletons.Box.X({
          className : `${pfx}__share-header`,
          kids      : [
            Skeletons.Note({ className: `${pfx}__share-email`, content: recipientText }),
            Skeletons.Note({ className: `${pfx}__share-permission`, content: permLabel })
          ]
        }),
        Skeletons.Note({ className: `${pfx}__share-meta`, content: `${lastAccessedStr} · ${expiryStr}` })
      ]
    }),
    Skeletons.Note({ className: `${pfx}__share-status ${isActive ? 'active' : 'inactive'}`, content: statusLabel })
  ];

  if (actions.length) {
    rowKids.push(Skeletons.Box.X({ className: `${pfx}__share-actions`, kids: actions }));
  }

  return Skeletons.Box.X({
    className : `${pfx}__share-row`,
    kids      : rowKids
  });
};

module.exports = __skl_secure_share_row;
