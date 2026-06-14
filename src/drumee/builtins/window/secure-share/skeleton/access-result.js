
// Post-decision confirmation modal (Figma screens 64 / 65 / 66). Shown after the
// sender approves or denies an access request:
//   • denied  → "Access Denied" (view only)
//   • approved → "Access granted" with the effective level (download / chat / full)
// Done closes the flow; Change permission reopens the approve popup. Rendered
// into the same approve overlay so it stacks over the dimmed backdrop.
const __skl_secure_share_access_result = function(_ui_, opts = {}) {
  // `opts.fig` lets a different host (e.g. the activity panel) reuse this modal
  // with the secure-share window's BEM root, so the same SCSS applies — no style
  // duplication. Defaults to the host widget's own family.
  const fig     = opts.fig || `${_ui_.fig.family}-access-result`;
  const req     = _ui_.mget('_pendingRequest') || {};
  // 'denied' or a comma-list SET of granted levels, e.g. "can_chat,can_edit".
  const outcome = _ui_.mget('_resultOutcome') || 'denied';
  const grantedLevels = outcome === 'denied'
    ? []
    : String(outcome).split(',').map(s => s.trim()).filter(Boolean);
  const email   = req.requester_email || '';
  const who     = req.requester_name || email || LOCALE.SECURE_SHARE_THIS_USER;
  const folder  = req.workspace_name || _ui_.mget(_a.title) || _ui_.mget(_a.filename) || _ui_.mget(_a.name) || '';
  const granted = grantedLevels.length > 0;

  // Per-outcome badge + copy.
  const CONFIG = {
    denied: {
      badge   : LOCALE.SECURE_SHARE_CAN_VIEW_BADGE,
      badgeIco: 'eye',
      sub     : null,
      desc    : LOCALE.SECURE_SHARE_RESULT_DESC_DENIED,
    },
    can_download: {
      badge   : LOCALE.SECURE_SHARE_CAN_DOWNLOAD,
      badgeIco: 'download',
      sub     : LOCALE.SECURE_SHARE_RESULT_SUB_DOWNLOAD,
      desc    : LOCALE.SECURE_SHARE_RESULT_DESC_DOWNLOAD,
    },
    can_chat: {
      badge   : LOCALE.SECURE_SHARE_CAN_CHAT,
      badgeIco: 'apps-chat',
      sub     : LOCALE.SECURE_SHARE_RESULT_SUB_CHAT,
      desc    : LOCALE.SECURE_SHARE_RESULT_DESC_CHAT,
    },
    can_edit: {
      badge   : LOCALE.SECURE_SHARE_FULL_ACCESS,
      badgeIco: 'apps-pencil-simple',
      sub     : LOCALE.SECURE_SHARE_RESULT_SUB_FULL,
      desc    : LOCALE.SECURE_SHARE_RESULT_DESC_FULL,
    },
  };
  // Representative config (highest granted level) drives the badge icon + copy;
  // the badge LABEL lists every granted level so a multi-grant reads e.g.
  // "Can Download, Can Chat". Denied uses the denied config.
  const ORDER = ['can_edit', 'can_download', 'can_chat'];
  const primary = ORDER.find(l => grantedLevels.includes(l));
  const cfg = granted ? { ...(CONFIG[primary] || CONFIG.can_download) } : CONFIG.denied;
  if (granted) {
    const LABELS = {
      can_download: LOCALE.SECURE_SHARE_CAN_DOWNLOAD,
      can_chat    : LOCALE.SECURE_SHARE_CAN_CHAT,
      can_edit    : LOCALE.SECURE_SHARE_CAN_EDIT,
    };
    cfg.badge = grantedLevels.map(l => LABELS[l] || l).join(', ');
  }

  // Status badge: tinted circle (green/red via SCSS modifier) + glyph.
  const statusIcon = Skeletons.Box.X({
    className : `${fig}__status-icon ${granted ? 'granted' : 'denied'}`,
    kids      : [
      Skeletons.Image.Svg({ className: `${fig}__status-glyph`, ico: granted ? 'checked' : 'cross' })
    ]
  });

  const title = Skeletons.Note({
    className : `${fig}__title`,
    content   : granted ? LOCALE.SECURE_SHARE_RESULT_GRANTED_TITLE : LOCALE.SECURE_SHARE_RESULT_DENIED_TITLE,
  });

  // Subtitle (granted only): "{name} has been notified and …".
  const subtitle = cfg.sub
    ? Skeletons.Note({ className: `${fig}__subtitle`, content: cfg.sub.replace('{name}', who) })
    : null;

  const infoBox = Skeletons.Box.X({
    className : `${fig}__info`,
    kids      : [
      Skeletons.Avatar('default', `${fig}__info-avatar`, email),
      Skeletons.Box.Y({
        className : `${fig}__info-text`,
        kids      : [
          email ? Skeletons.Note({ className: `${fig}__info-email`, content: email }) : null,
          Skeletons.Note({ className: `${fig}__info-folder`, content: `${LOCALE.SECURE_SHARE_RESULT_ACCESS_TO} ${folder}` }),
          Skeletons.Box.X({
            className : `${fig}__info-badge`,
            kids      : [
              Skeletons.Image.Svg({ className: `${fig}__info-badge-icon`, ico: cfg.badgeIco }),
              Skeletons.Note({ className: `${fig}__info-badge-label`, content: cfg.badge }),
            ]
          })
        ].filter(Boolean)
      })
    ]
  });

  const desc = Skeletons.Note({ className: `${fig}__desc`, content: cfg.desc });

  const doneBtn = Skeletons.Note({
    className : `${fig}__done button`,
    content   : LOCALE.DONE,
    service   : 'close-access-result',
    uiHandler : [_ui_],
    kidsOpt   : { active: 0 },
  });

  const changeBtn = Skeletons.Note({
    className : `${fig}__change button`,
    content   : LOCALE.SECURE_SHARE_CHANGE_PERMISSION,
    service   : 'change-permission',
    uiHandler : [_ui_],
    kidsOpt   : { active: 0 },
  });

  return Skeletons.Box.Y({
    className : `${fig}__panel`,
    debug     : __filename,
    kids      : [statusIcon, title, subtitle, infoBox, desc, doneBtn, changeBtn].filter(Boolean),
  });
};

module.exports = __skl_secure_share_access_result;
