// ==================================================================== *
//   Unified recipient gate (Toon 2026-06-12 redesign).
//   ONE adaptive card that shows the email field, the password field, or
//   BOTH (the "2.4 email + password" case) depending on what the share
//   requires. Reuses the `-password` BEM family so all existing card SCSS
//   applies, and keeps the same sys_pn part names (ref-email / ref-password /
//   button-wrapper / message-box) so the widget's onPartReady wiring is
//   unchanged. Replaces the old separate email.js + password.js prompts.
// ==================================================================== *

function __skl_dmz_sharebox_gate(_ui_, opts = {}) {
  const fig    = `${_ui_.fig.family}-password`;
  const sender = _ui_.mget('sender') || '';
  const title  = _ui_.mget(_a.title) || _ui_.mget(_a.filename) || _ui_.mget(_a.name) || '';
  const area   = _ui_.mget(_a.area) || _a.share;
  const locked = opts.locked || false;

  const needEmail    = !!(_ui_.mget('require_email') || _ui_.mget('recipient_email'));
  const needPassword = !!(_ui_.mget('require_password') || _ui_.mget('require_pwd'));

  // ── Top row: folder icon + workspace name + sender ────────────────────────
  const topRow = Skeletons.Box.X({
    className : `${fig}__card-top-row`,
    kids      : [
      Skeletons.Box.X({
        className : `${fig}__card-folder-icon`,
        kids      : [require('builtins/window/skeleton/topbar/folder-icon')(area)]
      }),
      Skeletons.Box.Y({
        className : `${fig}__card-info`,
        kids      : [
          title  ? Skeletons.Note({ className: `${fig}__card-workspace-name`, content: title }) : null,
          sender ? Skeletons.Note({ className: `${fig}__card-sender`, content: `${LOCALE.SECURE_SHARE_SHARED_BY_PREFIX} ${sender}` }) : null
        ]
      })
    ]
  });

  // A header + field group (one per required gate).
  const fieldGroup = (ico, titleText, descText, entry) => Skeletons.Box.Y({
    className : `${fig}__card-section`,
    kids      : [
      Skeletons.Box.Y({
        className : `${fig}__card-header-group`,
        kids      : [
          Skeletons.Box.X({
            className : `${fig}__card-title-row`,
            kids      : [
              Skeletons.Button.Svg({ ico, className: `${fig}__card-title-icon` }),
              Skeletons.Note({ className: `${fig}__card-title-text`, content: titleText })
            ]
          }),
          Skeletons.Note({ className: `${fig}__card-description`, content: descText })
        ]
      }),
      entry
    ]
  });

  const emailEntry = Skeletons.Box.X({
    className : `${fig}__row password has-check`,
    sys_pn    : 'email-row',
    dataset   : { valid: '' },
    kids      : [
      Skeletons.EntryBox({
        className    : `${fig}__entry password`,
        placeholder  : LOCALE.SECURE_SHARE_EMAIL_PLACEHOLDER,
        sys_pn       : 'ref-email',
        formItem     : _a.email,
        type         : _a.email,
        preselect    : 1,
        errorHandler : [_ui_],
        validators   : [
          { reason: LOCALE.SECURE_SHARE_ENTER_EMAIL, comply: Validator.require },
          { reason: LOCALE.INVALID_EMAIL,            comply: (v) => _ui_._strictEmail(v) }
        ],
        showError : false
      }),
      // Green check shown once a valid email is recognised (Figma 3.2.2).
      Skeletons.Button.Svg({
        ico       : 'apps-check-circle',
        className : `${fig}__entry-check`
      })
    ]
  });

  const passwordEntry = Skeletons.Box.X({
    className : `${fig}__row password`,
    kids      : [
      Skeletons.EntryBox({
        className    : `${fig}__entry password`,
        placeholder  : LOCALE.PASSWORD,
        sys_pn       : 'ref-password',
        formItem     : _a.password,
        type         : _a.password,
        preselect    : 1,
        errorHandler : [_ui_],
        validators   : [{ reason: LOCALE.DMZ_PASSWORD_TO_CONTINUE, comply: Validator.require }],
        showError    : false
      }),
      // Eye show/hide toggle — same glyphs as window-secure-share__password-eye
      // (eye_closed ↔ eye), driven by the toggle-password-visibility handler.
      Skeletons.Button.Svg({
        ico       : 'eye_closed',
        className : `${fig}__password-eye`,
        service   : 'toggle-password-visibility',
        uiHandler : _ui_
      })
    ]
  });

  // ── Body content: locked alert, or the required field group(s) + button ──
  let contentKids;
  if (locked) {
    contentKids = [
      Skeletons.Box.X({
        className : `${fig}__locked-alert`,
        kids      : [
          Skeletons.Button.Svg({ ico: 'apps-lock-padlock', className: `${fig}__locked-icon` }),
          Skeletons.Note({ className: `${fig}__locked-message`, content: LOCALE.SECURE_SHARE_ACCESS_LOCKED })
        ]
      })
    ];
  } else {
    const button = Skeletons.Box.X({
      className : `${fig}__row buttons-wrapper buttons`,
      sys_pn    : 'button-wrapper',
      service   : 'verify-gate',
      uiHandler : _ui_,
      state     : 0,
      dataset   : { error: 0, mode: _a.open },
      kidsOpt   : { active: 0 },
      kids      : [
        Skeletons.Note({
          className : `${fig}__button-confirm`,
          // Figma: any email-gated card (incl. the email+password 2.4 case) uses
          // "Continue"; a password-only card uses "Unlock".
          content   : needEmail ? LOCALE.SECURE_SHARE_CONTINUE : LOCALE.SECURE_SHARE_UNLOCK
        })
      ]
    });

    const messageBox = Skeletons.Box.X({
      className : `${fig}__row message-wrapper message no-background`,
      sys_pn    : 'message-box',
      dataset   : { mode: _a.closed }
    });

    contentKids = [
      needEmail    ? fieldGroup('email', LOCALE.SECURE_SHARE_ENTER_EMAIL, LOCALE.SECURE_SHARE_SENDER_REQUIRES_EMAIL, emailEntry) : null,
      needPassword ? fieldGroup('profile-lock', LOCALE.SECURE_SHARE_PASSWORD_REQUIRED, LOCALE.SECURE_SHARE_FOLDER_PROTECTED, passwordEntry) : null,
      button,
      messageBox
    ].filter(Boolean);
  }

  const body = Skeletons.Box.Y({
    className : `${fig}__card-body`,
    kids      : [
      ...contentKids,
      Skeletons.Note({
        className : `${fig}__card-footer`,
        // Figma: email-gated cards note the email will be shared; a password-only
        // card tells the viewer to contact the sender.
        content   : needEmail ? LOCALE.SECURE_SHARE_YOUR_EMAIL_SHARED : LOCALE.SECURE_SHARE_CONTACT_SENDER
      })
    ]
  });

  const card = Skeletons.Box.Y({
    className : `${fig}__container`,
    kids      : [topRow, body]
  });

  // Decorative blurred workspace backdrop behind the gate card (Figma: the
  // locked folder grid is shown blurred behind the card). The recipient is not
  // authenticated yet, so this is a purely decorative placeholder grid — it
  // renders no real content, just evokes the workspace beneath the gate.
  const tiles = [];
  for (let i = 0; i < 18; i++) {
    tiles.push(Skeletons.Box.X({ className: `${fig}__gate-backdrop-tile` }));
  }
  const backdrop = Skeletons.Box.Z({
    className : `${fig}__gate-backdrop`,
    kids      : [Skeletons.Box.X({ className: `${fig}__gate-backdrop-grid`, kids: tiles })]
  });

  return Skeletons.Box.Y({
    className : `${fig}__gate-wrap`,
    debug     : __filename,
    kids      : [backdrop, card]
  });
}

export default __skl_dmz_sharebox_gate;
