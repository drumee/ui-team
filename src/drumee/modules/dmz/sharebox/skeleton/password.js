
function __skl_dmz_sharebox_password(_ui_, opts = {}) {

  const passwordFig = `${_ui_.fig.family}-password`
  const sender      = _ui_.mget('sender') || ''
  const title       = _ui_.mget(_a.title) || _ui_.mget(_a.filename) || _ui_.mget(_a.name) || ''
  const area        = _ui_.mget(_a.area) || _a.share
  const locked      = opts.locked || false

  // ── Top row: folder icon + workspace name + sender ────────────────────────
  const topRow = Skeletons.Box.X({
    className : `${passwordFig}__card-top-row`,
    kids      : [
      Skeletons.Box.X({
        className : `${passwordFig}__card-folder-icon`,
        kids      : [
          require('builtins/window/skeleton/topbar/folder-icon')(area)
        ]
      }),
      Skeletons.Box.Y({
        className : `${passwordFig}__card-info`,
        kids      : [
          title ? Skeletons.Note({
            className : `${passwordFig}__card-workspace-name`,
            content   : title
          }) : null,
          sender ? Skeletons.Note({
            className : `${passwordFig}__card-sender`,
            content   : `${LOCALE.SECURE_SHARE_SHARED_BY_PREFIX} ${sender}`
          }) : null
        ]
      })
    ]
  })

  // ── Header group: icon + title + description ──────────────────────────────
  const headerGroup = Skeletons.Box.Y({
    className : `${passwordFig}__card-header-group`,
    kids      : [
      Skeletons.Box.X({
        className : `${passwordFig}__card-title-row`,
        kids      : [
          Skeletons.Button.Svg({
            ico       : 'profile-lock',
            className : `${passwordFig}__card-title-icon`
          }),
          Skeletons.Note({
            className : `${passwordFig}__card-title-text`,
            content   : LOCALE.SECURE_SHARE_PASSWORD_REQUIRED
          })
        ]
      }),
      Skeletons.Note({
        className : `${passwordFig}__card-description`,
        content   : LOCALE.SECURE_SHARE_FOLDER_PROTECTED
      })
    ]
  })

  // ── Body content: locked state or input + button + message ────────────────
  let contentKids

  if (locked) {
    // Figma 3.3.6 — locked state shown as a light-red alert box with icon.
    contentKids = [
      Skeletons.Box.X({
        className : `${passwordFig}__locked-alert`,
        kids      : [
          Skeletons.Button.Svg({
            ico       : 'apps-lock-padlock',
            className : `${passwordFig}__locked-icon`
          }),
          Skeletons.Note({
            className : `${passwordFig}__locked-message`,
            content   : LOCALE.SECURE_SHARE_ACCESS_LOCKED
          })
        ]
      })
    ]
  } else {
    const password = Skeletons.Box.X({
      className : `${passwordFig}__row password`,
      kids      : [
        Skeletons.EntryBox({
          className     : `${passwordFig}__entry password`,
          placeholder   : LOCALE.PASSWORD,
          sys_pn        : 'ref-password',
          formItem      : _a.password,
          type          : _a.password,
          shower        : 1,
          preselect     : 1,
          errorHandler  : [_ui_],
          validators    : [
            { reason: LOCALE.DMZ_PASSWORD_TO_CONTINUE, comply: Validator.require }
          ],
          showError     : false
        })
      ]
    })

    const button = Skeletons.Box.X({
      className : `${passwordFig}__row buttons-wrapper buttons`,
      sys_pn    : 'button-wrapper',
      service   : 'verify-password',
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
          className : `${passwordFig}__button-confirm`,
          content   : LOCALE.SECURE_SHARE_UNLOCK
        })
      ]
    })

    const messageBox = Skeletons.Box.X({
      className : `${passwordFig}__row message-wrapper message no-background`,
      sys_pn    : 'message-box',
      dataset   : {
        mode  : _a.closed
      }
    })

    contentKids = [password, button, messageBox]
  }

  // ── Body: header + content + footer ──────────────────────────────────────
  const body = Skeletons.Box.Y({
    className : `${passwordFig}__card-body`,
    kids      : [
      headerGroup,
      ...contentKids,
      Skeletons.Note({
        className : `${passwordFig}__card-footer`,
        content   : LOCALE.SECURE_SHARE_CONTACT_SENDER
      })
    ]
  })

  return Skeletons.Box.Y({
    className : `${passwordFig}__container`,
    debug     : __filename,
    kids      : [topRow, body]
  })
}

export default __skl_dmz_sharebox_password;
