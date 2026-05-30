
const __skl_secure_share_row = function(_ui_, row) {
  const pfx      = `${_ui_.fig.family}`;
  const isActive = !row.revoked_at && (!row.expiry_time || row.expiry_time > Date.now() / 1000);

  const statusLabel = row.revoked_at
    ? LOCALE.SECURE_SHARE_STATUS_REVOKED
    : (!isActive ? LOCALE.SECURE_SHARE_STATUS_EXPIRED : LOCALE.SECURE_SHARE_ACTIVE);

  const count    = row.access_count || 0;
  const viewsStr = count === 0
    ? LOCALE.SECURE_SHARE_NOT_OPENED
    : `${count} ${count === 1 ? LOCALE.SECURE_SHARE_VIEW : LOCALE.SECURE_SHARE_VIEWS}`;
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
        Skeletons.Note({ className: `${pfx}__share-email`, content: row.recipient_email }),
        Skeletons.Note({ className: `${pfx}__share-meta`,  content: `${viewsStr} · ${expiryStr}` })
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
