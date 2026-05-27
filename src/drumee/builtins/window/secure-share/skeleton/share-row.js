
const __skl_secure_share_row = function(_ui_, row) {
  const pfx = `${_ui_.fig.family}`;
  const isActive = !row.revoked_at && (!row.expiry_time || row.expiry_time > Date.now() / 1000);
  const statusLabel = row.revoked_at ? LOCALE.SECURE_SHARE_REVOKED
    : (!isActive ? LOCALE.SECURE_SHARE_EXPIRED : LOCALE.SECURE_SHARE_ACTIVE);

  const kids = [
    Skeletons.Note({ className: `${pfx}__share-email`, content: row.recipient_email }),
    Skeletons.Note({ className: `${pfx}__share-status ${isActive ? 'active' : 'inactive'}`, content: statusLabel }),
  ];

  if (isActive) {
    kids.push(
      Skeletons.Box.X({
        className : `${pfx}__share-revoke button`,
        service   : 'revoke-secure-share',
        token     : row.id,
        uiHandler : _ui_,
        kidsOpt   : { active: 0 },
        kids      : [
          Skeletons.Note({ content: LOCALE.SECURE_SHARE_REVOKE })
        ]
      })
    );
  }

  return Skeletons.Box.X({
    className : `${pfx}__share-row`,
    kids
  });
};

module.exports = __skl_secure_share_row;
