// ==================================================================== *
//   Request-access popup (Figma 60). Shown to a signed-in non-member who
//   lacks the capability they tried to use. Mirrors the sender-side
//   approve popup (Figma 63 / panel-activity approve-request) so the two
//   read as the same component: icon + label + checkbox ROWS.
//   NOTE: multi-select — a recipient can request several permissions at once
//   (the backend stores a SET). `select-request-level` toggles each row
//   independently. Only permissions the recipient does NOT already have are
//   offered (a download recipient can request chat/edit, not download).
// ==================================================================== *

function __skl_dmz_sharebox_request_access(_ui_) {
  const reqFig = `${_ui_.fig.family}-request-access`;

  const LEVEL_OPTIONS = [
    { level: 'can_download', label: LOCALE.SECURE_SHARE_CAN_DOWNLOAD, ico: 'download' },
    { level: 'can_chat',     label: LOCALE.SECURE_SHARE_CAN_CHAT,     ico: 'apps-chat' },
    { level: 'can_edit',     label: LOCALE.SECURE_SHARE_CAN_EDIT,     ico: 'apps-pencil-simple' },
  ];
  // Exclude permissions the recipient already holds (model flags can_download /
  // can_chat / can_edit from the share grant) — per Lexis 2026-06-14.
  const AVAILABLE = LEVEL_OPTIONS.filter(o => !_ui_.mget(o.level));

  // Header: title + × close (Figma 60 has no Cancel button — just the close).
  const header = Skeletons.Box.X({
    className : `${reqFig}__header`,
    kids      : [
      Skeletons.Note({ className: `${reqFig}__title`, content: LOCALE.SECURE_SHARE_REQUEST_ACCESS }),
      Skeletons.Button.Svg({ className: `${reqFig}__close`, ico: 'cross', service: 'close-request-access', uiHandler: [_ui_] }),
    ]
  });

  const levelPicker = Skeletons.Box.Y({
    className : `${reqFig}__level-picker`,
    kids      : [
      Skeletons.Note({ className: `${reqFig}__level-desc`, content: LOCALE.SECURE_SHARE_CHOOSE_LEVEL }),
      Skeletons.Box.Y({
        className : `${reqFig}__levels`,
        kids      : AVAILABLE.map(({ level, label, ico }) => Skeletons.Box.X({
          className : `${reqFig}__level-row`,
          service   : 'select-request-level',
          // `level` must be a top-level prop (not only in dataset) — the handler
          // reads it via `cmd.mget('level')`, which reads model props, not the
          // DOM dataset. The handler also toggles `data-selected` on every row
          // sharing `[data-level]`, giving single-select (radio) behavior.
          level,
          dataset   : { level, selected: '' },
          uiHandler : [_ui_],
          kidsOpt   : { active: 0 },
          kids      : [
            Skeletons.Box.X({
              className : `${reqFig}__level-main`,
              kids      : [
                Skeletons.Image.Svg({ className: `${reqFig}__level-icon`, ico }),
                Skeletons.Note({ className: `${reqFig}__level-label`, content: label }),
              ]
            }),
            Skeletons.Box.X({ className: `${reqFig}__level-check` }),
          ]
        }))
      })
    ]
  });

  const messageField = Skeletons.Textarea({
    className   : `${reqFig}__message`,
    sys_pn      : 'ref-request-message',
    placeholder : LOCALE.SECURE_SHARE_REQUEST_MESSAGE_PLACEHOLDER,
    rows        : 3,
    ignoreEnter : true,
    partHandler : _ui_,
    uiHandler   : [_ui_],
  });

  // Email field: Figma 60 shows none (the requester is signed-in, so their
  // account email is known). Render it only as a fallback when no email is
  // available, so submit never blank-aborts. submitAccessRequest() falls back
  // to the account/gate email when this field is absent.
  const knownEmail = (_ui_.mget('recipient_email') || Visitor.get('email') || '').trim();
  const emailField = knownEmail ? null : Skeletons.EntryBox({
    className   : `${reqFig}__email`,
    sys_pn      : 'ref-request-email',
    formItem    : 'request_email',
    placeholder : LOCALE.SECURE_SHARE_ENTER_EMAIL,
    value       : '',
    require     : 'email',
    showError   : false,
    partHandler : _ui_,
    uiHandler   : [_ui_],
  });

  // Inline error line (e.g. missing level / email). Hidden until populated —
  // the gate's renderErrorMessage targets gate-only parts, so this popup needs
  // its own feedback element.
  const errorLine = Skeletons.Note({
    className : `${reqFig}__error`,
    sys_pn    : 'request-error',
    content   : '',
    dataset   : { mode: _a.closed },
  });

  // Single full-width "Send request" (Figma 60) with a send glyph.
  const submit = Skeletons.Box.X({
    className : `${reqFig}__submit-btn`,
    sys_pn    : 'request-submit',
    service   : 'submit-access-request',
    uiHandler : [_ui_],
    kidsOpt   : { active: 0 },
    kids      : [
      Skeletons.Image.Svg({ className: `${reqFig}__submit-icon`, ico: 'app-send' }),
      Skeletons.Note({ className: `${reqFig}__submit-label`, content: LOCALE.SECURE_SHARE_SEND_REQUEST }),
    ]
  });

  return Skeletons.Box.Y({
    className : `${reqFig}__panel`,
    debug     : __filename,
    kids      : [
      header,
      levelPicker,
      messageField,
      emailField,
      errorLine,
      submit,
    ].filter(Boolean)
  });
}

export default __skl_dmz_sharebox_request_access;
