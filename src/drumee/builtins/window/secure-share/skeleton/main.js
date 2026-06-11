
const __skl_secure_share = function(_ui_) {
  const pfx   = _ui_.fig.family;
  const group = _ui_.fig.group;

  // ── Topbar (unchanged) ────────────────────────────────────
  const topbar = Skeletons.Box.X({
    className : `${group}-topbar__container`,
    sys_pn    : 'topbar',
    service   : _e.raise,
    kids      : [
      Skeletons.Box.X({
        className : `${pfx}__topbar-title forbiden`,
        kids      : [
          Skeletons.Note({
            sys_pn    : 'window-label',
            className : _a.name,
            content   : [_a.hub, _a.folder].includes(_ui_.mget(_a.filetype))
              ? LOCALE.SECURE_SHARE_TITLE_FOLDER
              : LOCALE.SECURE_SHARE_TITLE_FILE
          })
        ]
      }),
      require('window/skeleton/topbar/control')(_ui_, 'c')
    ]
  });

  const header = Skeletons.Box.X({
    className : `${pfx}__header ${group}__header`,
    kids      : [topbar]
  });

  // ── Permission level section ──────────────────────────────
  const PERM_LEVELS = [
    { level: 'can_view',     label: LOCALE.SECURE_SHARE_CAN_VIEW },
    { level: 'can_download', label: LOCALE.SECURE_SHARE_CAN_DOWNLOAD },
    { level: 'can_chat',     label: LOCALE.SECURE_SHARE_CAN_CHAT },
    { level: 'can_edit',     label: LOCALE.SECURE_SHARE_CAN_EDIT },
  ];

  const permSection = Skeletons.Box.Y({
    className : `${pfx}__perm-section`,
    kids      : [
      Skeletons.Note({ className: `${pfx}__perm-label`, content: LOCALE.SECURE_SHARE_PERMISSION_LEVEL }),
      Skeletons.Box.X({
        className : `${pfx}__perm-btns`,
        kids      : PERM_LEVELS.map(({ level, label }) => Skeletons.Box.X({
          className : `${pfx}__perm-btn button`,
          service   : 'select-permission',
          level,
          dataset   : { level, selected: level === 'can_view' ? 'yes' : '' },
          uiHandler : [_ui_],
          kidsOpt   : { active: 0 },
          kids      : [Skeletons.Note({ content: label })]
        }))
      })
    ]
  });

  // ── Access management section ─────────────────────────────
  const emailToggleRow = Skeletons.Box.X({
    className : `${pfx}__toggle-row`,
    kids      : [
      Skeletons.Note({ className: `${pfx}__toggle-label`, content: LOCALE.SECURE_SHARE_REQUIRE_EMAIL }),
      Skeletons.Box.X({
        className : `${pfx}__toggle`,
        dataset   : { for: 'require-email', on: '' },
        service   : 'toggle-require-email',
        uiHandler : [_ui_],
        kidsOpt   : { active: 0 },
        kids      : [Skeletons.Box.X({ className: `${pfx}__toggle-thumb` })]
      })
    ]
  });

  const emailGate = Skeletons.Box.Y({
    className : `${pfx}__email-gate`,
    dataset   : { mode: _a.closed },
    kids      : [
      Skeletons.Box.X({
        className : `${pfx}__chips-area`,
        sys_pn    : 'chips-container'
      }),
      Skeletons.EntryBox({
        className   : `${pfx}__chip-input`,
        sys_pn      : 'ref-chips-input',
        formItem    : 'chip_email',
        type        : _a.text,
        placeholder : LOCALE.SECURE_SHARE_ADD_EMAIL_PLACEHOLDER,
        mode        : 'commit',
        service     : 'add-email-chip',
        uiHandler   : [_ui_],
        showError   : false
      })
    ]
  });

  const passwordToggleRow = Skeletons.Box.X({
    className : `${pfx}__toggle-row`,
    kids      : [
      Skeletons.Note({ className: `${pfx}__toggle-label`, content: LOCALE.SECURE_SHARE_REQUIRE_PASSWORD }),
      Skeletons.Box.X({
        className : `${pfx}__toggle`,
        dataset   : { for: 'require-password', on: '' },
        service   : 'toggle-require-password',
        uiHandler : [_ui_],
        kidsOpt   : { active: 0 },
        kids      : [Skeletons.Box.X({ className: `${pfx}__toggle-thumb` })]
      })
    ]
  });

  const passwordGate = Skeletons.Box.Y({
    className : `${pfx}__password-gate`,
    dataset   : { mode: _a.closed },
    kids      : [
      Skeletons.EntryBox({
        className   : `${pfx}__input password`,
        sys_pn      : 'ref-create-password',
        formItem    : 'password',
        type        : _a.password,
        placeholder : LOCALE.SECURE_SHARE_PASSWORD_PLACEHOLDER,
        shower      : 1,
        showError   : false
      })
    ]
  });

  const accessSection = Skeletons.Box.Y({
    className : `${pfx}__access-section`,
    kids      : [emailToggleRow, emailGate, passwordToggleRow, passwordGate]
  });

  // ── Expiry section (unchanged) ────────────────────────────
  const expiryRow = Skeletons.Box.X({
    className : `${pfx}__row expiry`,
    kids      : [
      Skeletons.Note({ className: `${pfx}__label`, content: LOCALE.SECURE_SHARE_EXPIRY }),
      Skeletons.Box.X({
        className : `${pfx}__presets`,
        kids      : [
          Skeletons.Box.X({
            className : `${pfx}__preset button`,
            service   : 'expiry-preset',
            preset    : '1h',
            dataset   : { preset: '1h' },
            uiHandler : [_ui_],
            kidsOpt   : { active: 0 },
            kids      : [Skeletons.Note({ content: LOCALE.SECURE_SHARE_EXPIRY_1H })]
          }),
          Skeletons.Box.X({
            className : `${pfx}__preset button`,
            service   : 'expiry-preset',
            preset    : '24h',
            dataset   : { preset: '24h' },
            uiHandler : [_ui_],
            kidsOpt   : { active: 0 },
            kids      : [Skeletons.Note({ content: LOCALE.SECURE_SHARE_EXPIRY_24H })]
          }),
          Skeletons.Box.X({
            className : `${pfx}__preset button`,
            service   : 'expiry-preset',
            preset    : '7d',
            dataset   : { preset: '7d' },
            uiHandler : [_ui_],
            kidsOpt   : { active: 0 },
            kids      : [Skeletons.Note({ content: LOCALE.SECURE_SHARE_EXPIRY_7D })]
          }),
          Skeletons.Box.X({
            className : `${pfx}__preset button`,
            service   : 'expiry-preset',
            preset    : 'custom',
            dataset   : { preset: 'custom' },
            uiHandler : [_ui_],
            kidsOpt   : { active: 0 },
            kids      : [Skeletons.Note({ content: LOCALE.SECURE_SHARE_EXPIRY_CUSTOM })]
          })
        ]
      })
    ]
  });

  const customExpiryRow = Skeletons.Box.X({
    className : `${pfx}__row custom-expiry`,
    sys_pn    : 'custom-expiry',
    dataset   : { mode: _a.closed },
    kids      : [
      Skeletons.Note({ className: `${pfx}__label`, content: '' }),
      Skeletons.EntryBox({
        className   : `${pfx}__input days`,
        sys_pn      : 'ref-days',
        formItem    : 'days',
        type        : _a.number,
        placeholder : '0',
        showError   : false
      }),
      Skeletons.Note({ className: `${pfx}__expiry-sep`, content: LOCALE.DAY }),
      Skeletons.EntryBox({
        className   : `${pfx}__input hours`,
        sys_pn      : 'ref-hours',
        formItem    : 'hours',
        type        : _a.number,
        placeholder : '0',
        showError   : false
      }),
      Skeletons.Note({ className: `${pfx}__expiry-sep`, content: LOCALE.HOUR })
    ]
  });

  // ── Create button + link result (unchanged) ───────────────
  const createButton = Skeletons.Box.X({
    className : `${pfx}__row buttons`,
    kids      : [
      Skeletons.Box.X({
        className : `${pfx}__button submit button`,
        service   : 'create-secure-share',
        uiHandler : [_ui_],
        kidsOpt   : { active: 0 },
        kids      : [
          Skeletons.Note({ content: LOCALE.SECURE_SHARE_CREATE })
        ]
      })
    ]
  });

  const linkResult = Skeletons.Box.X({
    className : `${pfx}__row link-result`,
    sys_pn    : 'link-result',
    dataset   : { mode: _a.closed }
  });

  const body = Skeletons.Box.Y({
    className : `${pfx}__body`,
    kids      : [permSection, accessSection, expiryRow, customExpiryRow, createButton, linkResult]
  });

  // ── Share list section (unchanged) ───────────────────────
  const shareList = Skeletons.Box.Y({
    className : `${pfx}__share-list`,
    sys_pn    : 'share-list'
  });

  const listColsHeader = Skeletons.Box.X({
    className : `${pfx}__list-cols`,
    kids      : [
      Skeletons.Note({ className: `${pfx}__list-col col-recipient`, content: LOCALE.SECURE_SHARE_COL_RECIPIENT }),
      Skeletons.Note({ className: `${pfx}__list-col col-accessed`,  content: LOCALE.SECURE_SHARE_COL_ACCESSED }),
      Skeletons.Note({ className: `${pfx}__list-col col-expires`,   content: LOCALE.SECURE_SHARE_COL_EXPIRES }),
    ]
  });

  const listSection = Skeletons.Box.Y({
    className : `${pfx}__list-section`,
    kids      : [
      Skeletons.Note({ className: `${pfx}__list-header`, content: LOCALE.SECURE_SHARE_EXISTING }),
      listColsHeader,
      shareList
    ]
  });

  return Skeletons.Box.Y({
    className : `${pfx}__main ${group}__main drive-popup`,
    radio     : _a.parent,
    debug     : __filename,
    kids      : [
      header,
      body,
      listSection,
      Skeletons.Box.Z({
        className   : `${pfx}__approve-overlay`,
        sys_pn      : 'approve-overlay',
        dataset     : { mode: _a.closed },
        partHandler : _ui_,
      }),
    ]
  });
};

module.exports = __skl_secure_share;
