// ==================================================================== *
//   Approve-access popup (Figma 63), shown from an access-request
//   notification in the activity panel. Self-contained so the sender can
//   approve/deny without opening the secure-share window.
// ==================================================================== *

module.exports = function (_ui_, req = {}) {
  const pfx = `${_ui_.fig.family}-approve-request`;
  // Multi-select: the recipient may request several levels (comma-list / SET).
  const requestedSet = String(req.requested_level || '').split(',').map(s => s.trim()).filter(Boolean);

  const GRANT_LEVELS = [
    { level: 'can_download', label: LOCALE.SECURE_SHARE_CAN_DOWNLOAD, ico: 'download' },
    { level: 'can_chat',     label: LOCALE.SECURE_SHARE_CAN_CHAT,     ico: 'apps-chat' },
    { level: 'can_edit',     label: LOCALE.SECURE_SHARE_CAN_EDIT,     ico: 'apps-pencil-simple' },
  ];
  // Human label for the requested level(s) — was rendering the raw "can_download" token.
  const LEVEL_LABELS = {
    can_download: LOCALE.SECURE_SHARE_CAN_DOWNLOAD,
    can_chat    : LOCALE.SECURE_SHARE_CAN_CHAT,
    can_edit    : LOCALE.SECURE_SHARE_CAN_EDIT,
  };
  const requestedLabel = requestedSet.map(l => LEVEL_LABELS[l] || l).join(', ');
  // Reflect the recipient's request (and exclude any perm they already have): only
  // the requested levels are offered to grant, all pre-selected. Fall back to all
  // three for a legacy request with no parseable level.
  const GRANTABLE = requestedSet.length
    ? GRANT_LEVELS.filter(g => requestedSet.includes(g.level))
    : GRANT_LEVELS;

  const header = Skeletons.Box.X({
    className: `${pfx}__header`,
    kids: [
      Skeletons.Note({ className: `${pfx}__title`, content: LOCALE.SECURE_SHARE_APPROVE_TITLE }),
      Skeletons.Note({ className: `${pfx}__close`, content: '×', service: 'ar-close', uiHandler: [_ui_] }),
    ],
  });

  const infoBox = Skeletons.Box.Y({
    className: `${pfx}__info`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__info-top`,
        kids: [
          Skeletons.Avatar('default', `${pfx}__info-avatar`, req.requester_email || ''),
          Skeletons.Box.Y({
            className: `${pfx}__info-text`,
            kids: [
              Skeletons.Note({ className: `${pfx}__info-email`, content: req.requester_email || '' }),
              Skeletons.Note({
                className: `${pfx}__info-level`,
                content: `${LOCALE.SECURE_SHARE_REQUEST_LEVEL_LABEL} ${requestedLabel}`,
              }),
            ],
          }),
        ],
      }),
      req.message ? Skeletons.Note({ className: `${pfx}__info-message`, content: req.message }) : null,
    ].filter(Boolean),
  });

  const levelRows = Skeletons.Box.Y({
    className: `${pfx}__levels`,
    // `level` is a top-level prop (handler reads cmd.mget('level')); every
    // requested level is pre-selected (multi-select).
    kids: GRANTABLE.map(({ level, label, ico }) => Skeletons.Box.X({
      className: `${pfx}__level-row`,
      service: 'ar-select-level',
      level,
      dataset: { level, selected: (!requestedSet.length || requestedSet.includes(level)) ? 'yes' : '' },
      uiHandler: [_ui_],
      kidsOpt: { active: 0 },
      kids: [
        Skeletons.Box.X({
          className: `${pfx}__level-main`,
          kids: [
            Skeletons.Image.Svg({ className: `${pfx}__level-icon`, ico }),
            Skeletons.Note({ className: `${pfx}__level-label`, content: label }),
          ],
        }),
        Skeletons.Box.X({ className: `${pfx}__level-check` }),
      ],
    })),
  });

  return Skeletons.Box.Y({
    className: `${pfx}__panel`,
    debug: __filename,
    kids: [
      header,
      infoBox,
      Skeletons.Note({ className: `${pfx}__grant-label`, content: LOCALE.SECURE_SHARE_GRANT_LEVEL }),
      levelRows,
      Skeletons.Note({ className: `${pfx}__confirm`, content: LOCALE.CONFIRM, service: 'ar-approve', uiHandler: [_ui_] }),
      Skeletons.Note({ className: `${pfx}__deny`, content: LOCALE.SECURE_SHARE_DENY_ACCESS, service: 'ar-deny', uiHandler: [_ui_] }),
    ],
  });
};
