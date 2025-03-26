
function __skl_dmz_sharebox_password (_ui_) {

  const passwordFig = `${_ui_.fig.family}-password`

  const title = Skeletons.Box.X({
    className : `${passwordFig}__title`,
    kids      : [
      Skeletons.Note({
        className : `${passwordFig}__note title`,
        content   : LOCALE.DMZ_ENTER_PASSWORD_TO_ACCESS_FILES
      })
    ]
  })

  const password = Skeletons.Box.X({
    className : `${passwordFig}__row password`,
    sys_pn    : 'wrapper-password',
    kids      : [
      Skeletons.Button.Svg({
        ico       : 'profile-lock',
        className : `${passwordFig}__icon lock input-wrapper`,
      }),

      Skeletons.EntryBox({
        className   : `${passwordFig}__entry password with-icon`,
        placeholder : LOCALE.PASSWORD,
        sys_pn      : 'ref-password',
        formItem    : _a.password,
        type        : _a.password,
        shower      : 1,
        preselect   : 1,
        errorHandler  : [_ui_],
        validators    : [
          { reason: LOCALE.DMZ_PASSWORD_TO_CONTINUE , comply: Validator.require }
        ],
        showError     : false
      })
    ]
  })

  const button = Skeletons.Box.X({
    className : `${passwordFig}__row buttons-wrapper buttons no-background`,
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
        content   : LOCALE.GO
      })
    ]
  })

  const messageBox = Skeletons.Box.X({
    className : `${passwordFig}__row message-wrapper message no-background`,
    sys_pn    : 'message-box',
    dataset   :{
      mode  : _a.closed
    }
  })

  const a = Skeletons.Box.Y({
    className : `${passwordFig}__container`,
    debug     : __filename,
    kids      : [
      title,

      Skeletons.Box.Y({
        className : `${passwordFig}__content`,
        kids      : [
          password,
          button,
          messageBox
        ]
      })
    ]
  });

  return a;

};

export default __skl_dmz_sharebox_password;
