
const __skl_secure_share_approve_access = function(_ui_) {
  const approveFig = `${_ui_.fig.family}-approve-access`;
  const req        = _ui_.mget('_pendingRequest') || {};

  const GRANT_LEVELS = [
    { level: 'can_download', label: LOCALE.SECURE_SHARE_CAN_DOWNLOAD },
    { level: 'can_chat',     label: LOCALE.SECURE_SHARE_CAN_CHAT },
    { level: 'can_edit',     label: LOCALE.SECURE_SHARE_CAN_EDIT },
  ];

  const levelSelector = Skeletons.Box.X({
    className : `${approveFig}__levels`,
    kids      : GRANT_LEVELS.map(({ level, label }) => Skeletons.Note({
      className : `${approveFig}__level-btn`,
      content   : label,
      service   : 'select-grant-level',
      dataset   : { level, selected: '' },
      uiHandler : [_ui_],
    }))
  });

  const actions = Skeletons.Box.X({
    className : `${approveFig}__actions`,
    kids      : [
      Skeletons.Note({
        className : `${approveFig}__deny-btn`,
        content   : LOCALE.SECURE_SHARE_DENY_ACCESS,
        service   : 'deny-access-request',
        uiHandler : [_ui_],
      }),
      Skeletons.Note({
        className : `${approveFig}__approve-btn`,
        content   : LOCALE.SECURE_SHARE_APPROVE_ACCESS,
        service   : 'approve-access-request',
        uiHandler : [_ui_],
      }),
    ]
  });

  return Skeletons.Box.Y({
    className : `${approveFig}__panel`,
    debug     : __filename,
    kids      : [
      Skeletons.Note({
        className : `${approveFig}__close`,
        content   : '×',
        service   : 'close-approve-popup',
        uiHandler : [_ui_],
      }),
      Skeletons.Note({ className: `${approveFig}__title`, content: LOCALE.SECURE_SHARE_APPROVE_ACCESS }),
      Skeletons.Note({ className: `${approveFig}__email`, content: req.requester_email || '' }),
      Skeletons.Note({
        className : `${approveFig}__level`,
        content   : `${LOCALE.SECURE_SHARE_REQUEST_LEVEL_LABEL} ${req.requested_level || ''}`,
      }),
      req.message ? Skeletons.Note({ className: `${approveFig}__message`, content: req.message }) : null,
      levelSelector,
      actions,
    ]
  });
};

module.exports = __skl_secure_share_approve_access;
