
function __skl_dmz_sharebox_request_access(_ui_) {
  const reqFig = `${_ui_.fig.family}-request-access`;

  const LEVEL_OPTIONS = [
    { level: 'can_download', label: LOCALE.SECURE_SHARE_CAN_DOWNLOAD },
    { level: 'can_chat',     label: LOCALE.SECURE_SHARE_CAN_CHAT },
    { level: 'can_edit',     label: LOCALE.SECURE_SHARE_CAN_EDIT },
  ];

  const levelPicker = Skeletons.Box.Y({
    className : `${reqFig}__level-picker`,
    kids      : [
      Skeletons.Note({ className: `${reqFig}__level-desc`, content: LOCALE.SECURE_SHARE_CHOOSE_LEVEL }),
      Skeletons.Box.X({
        className : `${reqFig}__level-options`,
        kids      : LEVEL_OPTIONS.map(({ level, label }) => Skeletons.Note({
          className : `${reqFig}__level-option`,
          content   : label,
          service   : 'select-request-level',
          // `level` must be a top-level prop (not only in dataset) — the handler
          // reads it via `cmd.mget('level')`, which reads model props, not the
          // DOM dataset. Without it the selection was always undefined, so no
          // level highlighted and submit silently aborted (`!_selectedRequestLevel`).
          level,
          dataset   : { level, selected: '' },
          uiHandler : [_ui_],
        }))
      })
    ]
  });

  const emailField = Skeletons.EntryBox({
    className   : `${reqFig}__email`,
    sys_pn      : 'ref-request-email',
    formItem    : 'request_email',
    placeholder : LOCALE.SECURE_SHARE_ENTER_EMAIL,
    // This popup is only reached by signed-in users, so pre-fill their account
    // email (or the gate email). Kept visible/editable so it's never blank-submit.
    value       : _ui_.mget('recipient_email') || Visitor.get('email') || '',
    require     : 'email',
    showError   : false,
    partHandler : _ui_,
    uiHandler   : [_ui_],
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

  // Inline error line (e.g. missing email / level). Hidden until populated —
  // the gate's renderErrorMessage targets gate-only parts, so this popup needs
  // its own feedback element.
  const errorLine = Skeletons.Note({
    className : `${reqFig}__error`,
    sys_pn    : 'request-error',
    content   : '',
    dataset   : { mode: _a.closed },
  });

  const actions = Skeletons.Box.X({
    className : `${reqFig}__actions`,
    kids      : [
      Skeletons.Note({
        className : `${reqFig}__cancel-btn`,
        content   : LOCALE.CANCEL,
        service   : 'close-request-access',
        uiHandler : [_ui_],
      }),
      Skeletons.Note({
        className : `${reqFig}__submit-btn`,
        content   : LOCALE.SECURE_SHARE_REQUEST_ACCESS,
        service   : 'submit-access-request',
        uiHandler : [_ui_],
      }),
    ]
  });

  return Skeletons.Box.Y({
    className : `${reqFig}__panel`,
    debug     : __filename,
    kids      : [
      Skeletons.Note({ className: `${reqFig}__title`, content: LOCALE.SECURE_SHARE_REQUEST_ACCESS }),
      levelPicker,
      emailField,
      messageField,
      errorLine,
      actions,
    ]
  });
}

export default __skl_dmz_sharebox_request_access;
