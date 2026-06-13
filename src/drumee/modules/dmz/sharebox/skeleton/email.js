
function __skl_dmz_sharebox_email(_ui_) {

  const emailFig = `${_ui_.fig.family}-password`
  const sender   = _ui_.mget('sender') || ''
  const title    = _ui_.mget(_a.title) || _ui_.mget(_a.filename) || _ui_.mget(_a.name) || ''
  const area     = _ui_.mget(_a.area) || _a.share

  // ── Top row: folder icon + workspace name + sender ────────────────────────
  const topRow = Skeletons.Box.X({
    className : `${emailFig}__card-top-row`,
    kids      : [
      Skeletons.Box.X({
        className : `${emailFig}__card-folder-icon`,
        kids      : [
          require('builtins/window/skeleton/topbar/folder-icon')(area)
        ]
      }),
      Skeletons.Box.Y({
        className : `${emailFig}__card-info`,
        kids      : [
          title ? Skeletons.Note({
            className : `${emailFig}__card-workspace-name`,
            content   : title
          }) : null,
          sender ? Skeletons.Note({
            className : `${emailFig}__card-sender`,
            content   : `${LOCALE.SECURE_SHARE_SHARED_BY_PREFIX} ${sender}`
          }) : null
        ]
      })
    ]
  })

  // ── Header group: icon + title + description ──────────────────────────────
  const headerGroup = Skeletons.Box.Y({
    className : `${emailFig}__card-header-group`,
    kids      : [
      Skeletons.Box.X({
        className : `${emailFig}__card-title-row`,
        kids      : [
          Skeletons.Button.Svg({
            ico       : 'email',
            className : `${emailFig}__card-title-icon`
          }),
          Skeletons.Note({
            className : `${emailFig}__card-title-text`,
            content   : LOCALE.SECURE_SHARE_ENTER_EMAIL
          })
        ]
      }),
      Skeletons.Note({
        className : `${emailFig}__card-description`,
        content   : LOCALE.SECURE_SHARE_SENDER_REQUIRES_EMAIL
      })
    ]
  })

  // ── Input row ─────────────────────────────────────────────────────────────
  const emailEntry = Skeletons.Box.X({
    className : `${emailFig}__row password`,
    kids      : [
      Skeletons.EntryBox({
        className     : `${emailFig}__entry password`,
        placeholder   : LOCALE.SECURE_SHARE_EMAIL_PLACEHOLDER,
        sys_pn        : 'ref-email',
        formItem      : _a.email,
        type          : _a.email,
        preselect     : 1,
        errorHandler  : [_ui_],
        validators    : [
          { reason: LOCALE.SECURE_SHARE_ENTER_EMAIL, comply: Validator.require },
          { reason: LOCALE.INVALID_EMAIL, comply: Validator.email }
        ],
        showError : false
      })
    ]
  })

  // ── Button + message (preserve sys_pn for renderErrorMessage) ─────────────
  const button = Skeletons.Box.X({
    className : `${emailFig}__row buttons-wrapper buttons`,
    sys_pn    : 'button-wrapper',
    service   : 'verify-email',
    uiHandler : _ui_,
    state     : 0,
    dataset   : {
      error : 0,
      mode  : _a.open
    },
    kidsOpt   : {
      active : 0
    },
    kids      : [
      Skeletons.Note({
        className : `${emailFig}__button-confirm`,
        content   : LOCALE.SECURE_SHARE_CONTINUE
      })
    ]
  })

  const messageBox = Skeletons.Box.X({
    className : `${emailFig}__row message-wrapper message no-background`,
    sys_pn    : 'message-box',
    dataset   : {
      mode  : _a.closed
    }
  })

  // ── Body: header + input + button + message + footer ─────────────────────
  const body = Skeletons.Box.Y({
    className : `${emailFig}__card-body`,
    kids      : [
      headerGroup,
      emailEntry,
      button,
      messageBox,
      Skeletons.Note({
        className : `${emailFig}__card-footer`,
        content   : LOCALE.SECURE_SHARE_YOUR_EMAIL_SHARED
      })
    ]
  })

  return Skeletons.Box.Y({
    className : `${emailFig}__container`,
    debug     : __filename,
    kids      : [topRow, body]
  })
}

export default __skl_dmz_sharebox_email;
