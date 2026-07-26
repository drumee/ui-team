
// The SHARED LINKS list is hidden in every secure-share panel — for the creator
// too (Lexis, 2026-07-25): it confused people about what "access" means while the
// section gets reworked. Hidden, not removed: flip this flag back to true to
// restore it exactly as it was. Everything below it (the list skeleton, its
// loader and its revoke) is left intact and still guarded on its parts, so
// nothing runs while the section is not rendered.
const SHOW_SHARED_LINKS = false;

const __skl_secure_share = function(_ui_) {
  const pfx   = _ui_.fig.family;
  const group = _ui_.fig.group;

  // Leading row icon (non-interactive) — matches the Figma row glyphs.
  const rowIcon = (ico) => Skeletons.Image.Svg({ className: `${pfx}__row-icon`, ico });

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
            // Workspace-root entry (opened via folder "Manage access") titles as
            // "Manage access"; file/subfolder shares keep the default titles.
            content   : _ui_.mget('manage_access')
              ? LOCALE.MANAGE_ACCESS
              : [_a.hub, _a.folder].includes(_ui_.mget(_a.filetype))
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

  // ── Recipients mode (permission level) section ────────────
  // "Can View" is the implicit default (sharing = viewing) and is no longer a
  // row — these three are the upgrades. No row selected ⇒ can_view.
  // Single-select is preserved (handler unchanged); rendered with the Figma
  // row + checkbox styling.
  const PERM_LEVELS = [
    { level: 'can_download', ico: 'download',           label: LOCALE.SECURE_SHARE_CAN_DOWNLOAD },
    { level: 'can_chat',     ico: 'apps-chat',          label: LOCALE.SECURE_SHARE_CAN_CHAT },
    { level: 'can_edit',     ico: 'apps-pencil-simple', label: LOCALE.SECURE_SHARE_CAN_EDIT },
  ];

  const permSection = Skeletons.Box.Y({
    className : `${pfx}__perm-section`,
    kids      : [
      Skeletons.Note({ className: `${pfx}__section-label`, content: LOCALE.SECURE_SHARE_PERMISSION_LEVEL }),
      Skeletons.Note({ className: `${pfx}__section-hint`,  content: LOCALE.SECURE_SHARE_PERMISSION_HINT }),
      Skeletons.Box.Y({
        className : `${pfx}__perm-btns`,
        kids      : PERM_LEVELS.map(({ level, ico, label }) => Skeletons.Box.X({
          className : `${pfx}__perm-btn button`,
          service   : 'select-permission',
          level,
          dataset   : { level, selected: '' },
          uiHandler : [_ui_],
          kidsOpt   : { active: 0 },
          kids      : [
            Skeletons.Box.X({
              className : `${pfx}__row-main`,
              kids      : [ rowIcon(ico), Skeletons.Note({ className: `${pfx}__row-title`, content: label }) ]
            }),
            Skeletons.Box.X({ className: `${pfx}__checkbox` })
          ]
        }))
      })
    ]
  });

  // ── Access management section ─────────────────────────────
  // Single choice: Public share vs Secure share. Choosing Secure reveals two
  // independent checkboxes (require email / require password). The allowed-emails
  // chip list lives under "require email" and is optional.
  const modeOption = (mode, ico, title, desc, selected) => Skeletons.Box.X({
    className : `${pfx}__mode-option button`,
    service   : 'select-share-mode',
    share_mode: mode,
    dataset   : { mode, selected: selected ? 'yes' : '' },
    uiHandler : [_ui_],
    kidsOpt   : { active: 0 },
    kids      : [
      Skeletons.Box.X({
        className : `${pfx}__row-main`,
        kids      : [
          rowIcon(ico),
          Skeletons.Box.Y({
            className : `${pfx}__mode-text`,
            kids      : [
              Skeletons.Note({ className: `${pfx}__mode-title`, content: title }),
              Skeletons.Note({ className: `${pfx}__mode-desc`,  content: desc })
            ]
          })
        ]
      }),
      Skeletons.Box.X({ className: `${pfx}__radio` })
    ]
  });

  const publicOption = modeOption('public', 'apps-globe',       LOCALE.SECURE_SHARE_MODE_PUBLIC, LOCALE.SECURE_SHARE_MODE_PUBLIC_DESC, true);
  const secureOption = modeOption('secure', 'apps-lock-shield', LOCALE.SECURE_SHARE_MODE_SECURE, LOCALE.SECURE_SHARE_MODE_SECURE_DESC, false);

  // A secure-option row: leading icon + title/desc + trailing checkbox.
  const checkRow = (forKey, service, ico, title, desc) => Skeletons.Box.X({
    className : `${pfx}__check-row button`,
    service,
    uiHandler : [_ui_],
    kidsOpt   : { active: 0 },
    kids      : [
      Skeletons.Box.X({
        className : `${pfx}__row-main`,
        kids      : [
          rowIcon(ico),
          Skeletons.Box.Y({
            className : `${pfx}__mode-text`,
            kids      : [
              Skeletons.Note({ className: `${pfx}__mode-title`, content: title }),
              Skeletons.Note({ className: `${pfx}__mode-desc`,  content: desc })
            ]
          })
        ]
      }),
      Skeletons.Box.X({ className: `${pfx}__check`, dataset: { for: forKey, on: '' } })
    ]
  });

  const emailCheckRow = checkRow(
    'require-email', 'toggle-require-email', 'app-mail',
    LOCALE.SECURE_SHARE_REQUIRE_EMAIL, LOCALE.SECURE_SHARE_REQUIRE_EMAIL_DESC
  );

  const emailGate = Skeletons.Box.Y({
    className : `${pfx}__email-gate`,
    dataset   : { mode: _a.closed },
    kids      : [
      Skeletons.Box.X({
        className : `${pfx}__sub-label-row`,
        kids      : [
          Skeletons.Note({ className: `${pfx}__sub-label`, content: LOCALE.SECURE_SHARE_ALLOW_EMAILS }),
          Skeletons.Image.Svg({ className: `${pfx}__sub-label-info`, ico: 'info', tooltips: LOCALE.SECURE_SHARE_ALLOW_EMAILS_HINT })
        ]
      }),
      Skeletons.Box.X({
        className : `${pfx}__chips-area`,
        sys_pn    : 'chips-container'
      }),
      Skeletons.EntryBox({
        className   : `${pfx}__chip-input`,
        sys_pn      : 'ref-chips-input',
        formItem    : 'chip_email',
        type        : _a.text,
        // Keep Chrome from treating this as the "username" half of a login
        // form paired with the password field below (see password-input note).
        autocomplete: 'off',
        placeholder : LOCALE.SECURE_SHARE_ADD_EMAIL_PLACEHOLDER,
        mode        : 'commit',
        service     : 'add-email-chip',
        uiHandler   : [_ui_],
        showError   : false
      })
    ]
  });

  const passwordCheckRow = checkRow(
    'require-password', 'toggle-require-password', 'apps-lock-padlock',
    LOCALE.SECURE_SHARE_REQUIRE_PASSWORD, LOCALE.SECURE_SHARE_REQUIRE_PASSWORD_DESC
  );

  // Password field — same pattern as the signin form (welcome/signin): a grey
  // row holding the entry + an eye toggle that swaps eye_closed↔eye and flips
  // its colour via data-state (handled in index.js _togglePasswordVisibility).
  const passwordGate = Skeletons.Box.Y({
    className : `${pfx}__password-gate`,
    dataset   : { mode: _a.closed },
    kids      : [
      Skeletons.Box.X({
        className : `${pfx}__password-row`,
        kids      : [
          Skeletons.EntryBox({
            className   : `${pfx}__password-input`,
            sys_pn      : 'ref-create-password',
            formItem    : 'password',
            name        : 'password',
            type        : _a.password,
            // This is a share-protection password the user CREATES — not a
            // login. Without this, the input template falls back to
            // autocomplete="password" (name), so Chrome's password manager
            // treats the panel as a sign-in form, autofills the saved email
            // into the nearest visible text field (the topbar search) and
            // focuses it. 'new-password' declassifies it → no autofill/focus
            // hijack. See the permission_restricted panel (no password field)
            // which never triggers this.
            autocomplete: 'new-password',
            placeholder : LOCALE.SECURE_SHARE_PASSWORD_PLACEHOLDER,
            uiHandler   : [_ui_],
            showError   : false
          }),
          Skeletons.Button.Svg({
            ico       : 'eye_closed',
            className : `${pfx}__password-eye`,
            service   : 'toggle-password-visibility',
            uiHandler : [_ui_]
          })
        ]
      })
    ]
  });

  // Figma: each control (require-email / password) is its own white sub-card —
  // the check-row is the card header and the gate (chips/input) is its body.
  const emailSubcard = Skeletons.Box.Y({
    className : `${pfx}__secure-subcard`,
    kids      : [emailCheckRow, emailGate]
  });

  const passwordSubcard = Skeletons.Box.Y({
    className : `${pfx}__secure-subcard`,
    kids      : [passwordCheckRow, passwordGate]
  });

  const secureOptions = Skeletons.Box.Y({
    className : `${pfx}__secure-options`,
    sys_pn    : 'secure-options',
    dataset   : { mode: _a.closed },
    kids      : [emailSubcard, passwordSubcard]
  });

  // Figma: choosing Secure nests the email/password options INSIDE the Secure
  // card — one purple-bordered, light-purple panel wrapping the Secure row and
  // its options. _selectShareMode toggles `data-selected` on this card.
  const secureCard = Skeletons.Box.Y({
    className : `${pfx}__secure-card`,
    dataset   : { selected: '' },
    kids      : [secureOption, secureOptions]
  });

  const modeGroup = Skeletons.Box.Y({
    className : `${pfx}__mode-group`,
    kids      : [publicOption, secureCard]
  });

  const accessSection = Skeletons.Box.Y({
    className : `${pfx}__access-section`,
    kids      : [
      Skeletons.Note({ className: `${pfx}__section-label`, content: LOCALE.SECURE_SHARE_ACCESS_MGMT }),
      modeGroup
    ]
  });

  // ── Expiry section ────────────────────────────────────────
  // Figma collapsed state = "Link Expiration" label + toggle. Toggling it on
  // reveals the existing presets + calendar picker (no functionality removed).
  const expiryPresets = Skeletons.Box.X({
    className : `${pfx}__presets`,
    kids      : ['1h', '24h', '7d', 'custom'].map(preset => Skeletons.Box.X({
      className : `${pfx}__preset button`,
      service   : 'expiry-preset',
      preset,
      dataset   : { preset },
      uiHandler : [_ui_],
      kidsOpt   : { active: 0 },
      kids      : [
        Skeletons.Note({ content: {
          '1h'     : LOCALE.SECURE_SHARE_EXPIRY_1H,
          '24h'    : LOCALE.SECURE_SHARE_EXPIRY_24H,
          '7d'     : LOCALE.SECURE_SHARE_EXPIRY_7D,
          'custom' : LOCALE.SECURE_SHARE_EXPIRY_CUSTOM,
        }[preset] }),
        // Custom segment shows the selected range length in days, filled in
        // once an end date is picked (see _onExpiryDatePicked).
        preset === 'custom'
          ? Skeletons.Note({ className: `${pfx}__preset-days`, sys_pn: 'custom-days', content: '' })
          : null,
      ].filter(Boolean)
    }))
  });

  // Custom expiry → calendar date/time picker (per Figma "set date" screens).
  const customExpiryRow = Skeletons.Box.X({
    className : `${pfx}__row custom-expiry`,
    sys_pn    : 'custom-expiry',
    dataset   : { mode: _a.closed },
    kids      : [
      Skeletons.Note({ className: `${pfx}__label`, content: LOCALE.SECURE_SHARE_EXPIRY_DATE }),
      {
        // seeds.js registers the lazy chunk under the alias `date_picker`;
        // referencing `KIND.datepicker` yields an unregistered name (safe-object
        // echoes the key) so the chunk never loads → "Snippet not found".
        kind      : KIND.date_picker,
        className : `${pfx}__datepicker`,
        name      : 'expiry-date',
        placement : 'up',
        // Range: the user picks a start + end date; all days between are
        // highlighted and link validity = endDate - startDate in days (see
        // _onExpiryDatePicked). `value: []` starts with no preselected range.
        // `rangeEdit` lets the user click an endpoint to deselect it or move
        // the nearest endpoint instead of restarting the range.
        ranges    : true,
        rangeEdit : true,
        value     : [],
        service   : 'expiry-date-picked',
        uiHandler : [_ui_],
        // `inline: true` renders the month grid in normal flow (the focus
        // popup was clipped by the drawer's `overflow: hidden`); the skin then
        // floats it as an absolute overlay over the panel (Figma "set date").
        // Date-only — no time row, matching the Figma calendar card.
        vendorOpt : { dateFormat: 'd/m/Y', minDate: 'today', inline: true }
      }
    ]
  });

  const expirySection = Skeletons.Box.Y({
    className : `${pfx}__expiry-section`,
    kids      : [
      Skeletons.Box.X({
        className : `${pfx}__expiry-header`,
        kids      : [
          Skeletons.Note({ className: `${pfx}__section-label`, content: LOCALE.SECURE_SHARE_EXPIRY }),
          Skeletons.Box.X({
            className : `${pfx}__toggle`,
            service   : 'toggle-expiry',
            dataset   : { on: '' },
            uiHandler : [_ui_],
            kidsOpt   : { active: 0 },
            kids      : [Skeletons.Box.X({ className: `${pfx}__toggle-thumb` })]
          })
        ]
      }),
      Skeletons.Box.Y({
        className : `${pfx}__expiry-options`,
        dataset   : { mode: _a.closed },
        kids      : [expiryPresets, customExpiryRow]
      })
    ]
  });

  // ── Get link button + link result ─────────────────────────
  const createButton = Skeletons.Box.X({
    className : `${pfx}__button submit button`,
    service   : 'create-secure-share',
    uiHandler : [_ui_],
    kidsOpt   : { active: 0 },
    kids      : [
      Skeletons.Image.Svg({ className: `${pfx}__button-icon`, ico: 'apps-link-simple' }),
      Skeletons.Note({ content: LOCALE.SECURE_SHARE_CREATE })
    ]
  });

  const linkResult = Skeletons.Box.X({
    className : `${pfx}__row link-result`,
    sys_pn    : 'link-result',
    dataset   : { mode: _a.closed }
  });

  // ── Notify when someone opens (Figma — below Get link) ────
  // Defaults ON, mirroring the existing always-notify behaviour.
  const notifySection = Skeletons.Box.X({
    className : `${pfx}__notify-row`,
    kids      : [
      Skeletons.Note({ className: `${pfx}__notify-label`, content: LOCALE.SECURE_SHARE_NOTIFY_ON_OPEN }),
      Skeletons.Box.X({
        className : `${pfx}__toggle`,
        service   : 'toggle-notify',
        dataset   : { on: 'yes' },
        uiHandler : [_ui_],
        kidsOpt   : { active: 0 },
        kids      : [Skeletons.Box.X({ className: `${pfx}__toggle-thumb` })]
      })
    ]
  });

  const body = Skeletons.Box.Y({
    className : `${pfx}__body`,
    kids      : [permSection, accessSection, expirySection, createButton, linkResult, notifySection]
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

  // SHARED LINKS = secondary link-management list (Copy / Revoke / status),
  // collapsed by default under a clickable header (count appended at load time).
  const listSection = Skeletons.Box.Y({
    className : `${pfx}__list-section`,
    kids      : [
      Skeletons.Box.X({
        className : `${pfx}__list-toggle`,
        service   : 'toggle-shared-links',
        uiHandler : [_ui_],
        kidsOpt   : { active: 0 },
        kids      : [
          Skeletons.Note({ className: `${pfx}__list-header`, sys_pn: 'shared-links-label', content: LOCALE.SECURE_SHARE_EXISTING })
        ]
      }),
      Skeletons.Box.Y({
        className : `${pfx}__list-body`,
        sys_pn    : 'shared-links-body',
        dataset   : { mode: _a.closed },
        kids      : [ listColsHeader, shareList ]
      })
    ]
  });

  // ── "View access list" — per-access-event table (Figma 2.2.3) ──
  // PRIMARY view: auto-expanded and loaded on render (mode open). The toggle
  // still collapses/expands it.
  const accessListSection = Skeletons.Box.Y({
    className : `${pfx}__events-section`,
    kids      : [
      Skeletons.Box.X({
        className : `${pfx}__events-toggle`,
        service   : 'toggle-access-list',
        uiHandler : [_ui_],
        kidsOpt   : { active: 0 },
        kids      : [
          Skeletons.Note({ className: `${pfx}__events-toggle-label`, sys_pn: 'access-events-label', content: LOCALE.SECURE_SHARE_VIEW_ACCESS_LIST })
        ]
      }),
      Skeletons.Box.Y({
        className   : `${pfx}__events-container`,
        sys_pn      : 'access-events',
        partHandler : _ui_,
        dataset     : { mode: _a.open }
      })
    ]
  });

  return Skeletons.Box.Y({
    className : `${pfx}__main ${group}__main drive-popup`,
    radio     : _a.parent,
    debug     : __filename,
    kids      : [
      header,
      Skeletons.Box.Y({
        className : `${pfx}__scroll`,
        kids      : [
          body,
          accessListSection,
          ...(SHOW_SHARED_LINKS ? [listSection] : []),
        ]
      }),
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
