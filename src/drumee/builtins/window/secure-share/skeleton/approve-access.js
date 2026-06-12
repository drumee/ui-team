
const __skl_secure_share_approve_access = function(_ui_) {
  const approveFig = `${_ui_.fig.family}-approve-access`;
  const req        = _ui_.mget('_pendingRequest') || {};
  const requested  = req.requested_level;

  const GRANT_LEVELS = [
    { level: 'can_download', label: LOCALE.SECURE_SHARE_CAN_DOWNLOAD, ico: 'download' },
    { level: 'can_chat',     label: LOCALE.SECURE_SHARE_CAN_CHAT,     ico: 'apps-chat' },
    { level: 'can_edit',     label: LOCALE.SECURE_SHARE_CAN_EDIT,     ico: 'apps-pencil-simple' },
  ];

  // ── Header: title + close ────────────────────────────────────────────────
  const header = Skeletons.Box.X({
    className : `${approveFig}__header`,
    kids      : [
      Skeletons.Note({ className: `${approveFig}__title`, content: LOCALE.SECURE_SHARE_APPROVE_TITLE }),
      Skeletons.Note({
        className : `${approveFig}__close`,
        content   : '×',
        service   : 'close-approve-popup',
        uiHandler : [_ui_],
      }),
    ],
  });

  // ── Info box: avatar + email + requested level + message ──────────────────
  const infoBox = Skeletons.Box.Y({
    className : `${approveFig}__info`,
    kids      : [
      Skeletons.Box.X({
        className : `${approveFig}__info-top`,
        kids      : [
          Skeletons.Avatar('default', `${approveFig}__info-avatar`, req.requester_email || ''),
          Skeletons.Box.Y({
            className : `${approveFig}__info-text`,
            kids      : [
              Skeletons.Note({ className: `${approveFig}__info-email`, content: req.requester_email || '' }),
              Skeletons.Note({
                className : `${approveFig}__info-level`,
                content   : `${LOCALE.SECURE_SHARE_REQUEST_LEVEL_LABEL} ${req.requested_level || ''}`,
              }),
            ],
          }),
        ],
      }),
      req.message ? Skeletons.Note({ className: `${approveFig}__info-message`, content: req.message }) : null,
    ].filter(Boolean),
  });

  // ── Grant-level rows: icon + label + checkbox (single-select) ─────────────
  const levelRows = Skeletons.Box.Y({
    className : `${approveFig}__levels`,
    kids      : GRANT_LEVELS.map(({ level, label, ico }) => Skeletons.Box.X({
      className : `${approveFig}__level-row`,
      service   : 'select-grant-level',
      // `level` must be a top-level prop — the handler reads `cmd.mget('level')`.
      level,
      // Pre-select the level the recipient requested (Figma default).
      dataset   : { level, selected: (level === requested) ? 'yes' : '' },
      uiHandler : [_ui_],
      kidsOpt   : { active: 0 },
      kids      : [
        Skeletons.Box.X({
          className : `${approveFig}__level-main`,
          kids      : [
            Skeletons.Image.Svg({ className: `${approveFig}__level-icon`, ico }),
            Skeletons.Note({ className: `${approveFig}__level-label`, content: label }),
          ],
        }),
        Skeletons.Box.X({ className: `${approveFig}__level-check` }),
      ],
    })),
  });

  // ── Stacked Confirm (purple) / Deny (red) buttons ─────────────────────────
  const confirm = Skeletons.Note({
    className : `${approveFig}__confirm`,
    content   : LOCALE.CONFIRM,
    service   : 'approve-access-request',
    uiHandler : [_ui_],
  });
  const deny = Skeletons.Note({
    className : `${approveFig}__deny`,
    content   : LOCALE.SECURE_SHARE_DENY_ACCESS,
    service   : 'deny-access-request',
    uiHandler : [_ui_],
  });

  return Skeletons.Box.Y({
    className : `${approveFig}__panel`,
    debug     : __filename,
    kids      : [
      header,
      infoBox,
      Skeletons.Note({ className: `${approveFig}__grant-label`, content: LOCALE.SECURE_SHARE_GRANT_LEVEL }),
      levelRows,
      confirm,
      deny,
    ],
  });
};

module.exports = __skl_secure_share_approve_access;
