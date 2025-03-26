const { toggleState } = require("core/utils")

function __skl_widget_member_form  (_ui_) {
  const formFig = _ui_.fig.family
  const data = _ui_._memberData

  const emailValidators = [
    {reason: LOCALE.ENTER_VALID_EMAIL , comply: Validator.email},
    {reason: LOCALE.EMAIL_REQUIRED , comply: Validator.require}
  ]
  
  const name = Skeletons.Box.X({
    className  : `${formFig}__wrapper name`,
    kids       : [
      Skeletons.Button.Svg({
        ico         : 'profile-signup',
        className   : `${formFig}__icon name profile-signup`
      }),
    
      Skeletons.Box.Y({
        className   : `${formFig}__entry-wrapper name`,
        kids        : [
          Skeletons.EntryBox({
            className     : `${formFig}__entry firstname`,
            formItem      : _a.firstname,
            placeholder   : LOCALE.FIRSTNAME,
            value         : data.firstname,
            preselect     : 1,
            uiHandler     : _ui_,
            errorHandler  : [_ui_],
            showError     : 1,
            validators    : [
              { reason: LOCALE.FIRST_NAME_REQUIRED, comply: Validator.require } //'First name is required'
            ]
          }),
          
          Skeletons.EntryBox({
            className     : `${formFig}__entry familyname`,
            formItem      : _a.lastname,
            placeholder   : LOCALE.LASTNAME,
            value         : data.lastname,
            uiHandler     : _ui_,
            errorHandler  : [_ui_],
            showError     : 1,
            validators    : [
              { reason: LOCALE.LASTNAME_REQUIRED , comply: Validator.require } //'Last name is required'
            ]
          })
        ]
      })
    ]
  })

  const email = Skeletons.Box.X({
    className   : `${formFig}__wrapper email`,
    kids        : [
      Skeletons.Button.Svg({
        ico         : 'email',
        className   : `${formFig}__icon email`
      }),

      Skeletons.EntryBox({
        className   : `${formFig}__entry email`,
        formItem    : _a.email,
        innerClass  : _a.email,
        interactive : 1,
        sys_pn      : 'email-input',
        placeholder : LOCALE.EMAIL,
        value       : data.email,
        uiHandler     : _ui_,
        errorHandler  : [_ui_],
        validators    : emailValidators,
        showError     : 1
      }),
    ]
  })

  const ident = Skeletons.Box.X({
    className   : `${formFig}__wrapper ident`,
    kids        : [
      Skeletons.Button.Svg({
        ico         : 'account_id',
        className   : `${formFig}__icon ident account_id`
      }),

      Skeletons.EntryBox({
        className     : `${formFig}__entry ident`,
        formItem      : _a.ident,
        innerClass    : _a.ident,
        interactive   : 1,
        sys_pn        : 'ident-input',
        placeholder   : LOCALE.USERNAME,
        value         : data.ident,
        uiHandler     : _ui_,
        errorHandler  : [_ui_],
        // validators    : [
        //   { reason: LOCALE.ERR_ID_REQUIRED, comply: Validator.require }
        // ],
        showError     : 1
      }),
    ]
  })

  const mobile = Skeletons.Box.X({
    className   : `${formFig}__wrapper mobile`,
    kids        : [
      Skeletons.Button.Svg({
        ico         : 'account_phone',
        className   : `${formFig}__icon mobile account_phone`
      }),

      Skeletons.Box.X({
        className  : `${formFig}__area-code`,
        kids       : [
          Skeletons.Note({
            className : `${formFig}__note area-code`,
            content   : '+'
          }),
    
          Skeletons.EntryBox({
            className     : `${formFig}__entry area-code`,
            formItem      : 'areacode',
            innerClass    : 'area-code',
            type          : _a.number,
            sys_pn        : 'area-code-input',
            interactive   : 1,
            placeholder   : LOCALE.AREA,
            value         : data.areacode.replace('+', ''),
            uiHandler     : _ui_,
            errorHandler  : [_ui_],
            showError     : 1,
          }),
        ]
      }),

      Skeletons.EntryBox({
        className     : `${formFig}__entry mobile`,
        formItem      : _a.mobile,
        innerClass    : _a.mobile,
        sys_pn        : 'mobile-input',
        interactive   : 1,
        placeholder   : LOCALE.PHONE,
        value         : data.mobile,
        uiHandler     : _ui_,
        errorHandler  : [_ui_],
        showError     : 1,
        validators    : [
          { reason: LOCALE.VALID_PHONE_NO , comply: Validator.phone }
        ],
      })
    ]
  })

  const address = Skeletons.Box.X({
    className   : `${formFig}__wrapper address`,
    kids        : [
      Skeletons.Button.Svg({
        ico         : 'ab_address',
        className   : `${formFig}__icon address ab_address`
      }),

      Skeletons.Box.Y({
        className : `${formFig}__entry-wrapper address`,
        formItem  : _a.address,
        dataType  : _a.object,
        kids      : [
          Skeletons.Entry({
            className   : `${formFig}__entry street address-item`,
            formItem    : _a.street,
            placeholder : LOCALE.NUMBER_STREET,
            uiHandler   : _ui_,
            value       : data.address.street
          }),
        
          Skeletons.Entry({
            className   : `${formFig}__entry zip address-item`,
            formItem    : _a.city,
            placeholder : LOCALE.ZIP_CODE_CITY,
            uiHandler   : _ui_,
            value       : data.address.city
          }),
          
          Skeletons.Entry({
            className   : `${formFig}__entry country address-item`,
            formItem    : _a.country,
            placeholder : LOCALE.COUNTRY,
            uiHandler   : _ui_,
            value       : data.address.country
          })
        ]
      })
    ]
  })


  const _securityState = toggleState(data.otp)

  if (_ui_._type == 'member_edit') {
    if (Visitor.domainCan(_K.permission.admin_view, data.privilege)) {
      let _icon = 'account_cross'
      if (_securityState) {
        _icon = 'backoffice_checkboxfill'
      }
    
      security = Skeletons.Box.X({
        className   : `${formFig}__wrapper security`,
        kids        : [
          Skeletons.Button.Svg({
            ico         : 'lock',
            className   : `${formFig}__icon security lock`
          }),
    
          Skeletons.Box.X({
            className   : `${formFig}__security-wrapper`,
            kids        : [
              Skeletons.Note({
                className : `${formFig}__note security`,
                content   : LOCALE.DOUBLE_AUTHENTICATION_WITH_SMS_CODE//'Double authentication with sms code'
              }),
            ]
          })
        ]
      })
    }
  }
  

  const messageBox = Skeletons.Box.X({
    className : `${formFig}__message-box`,
    sys_pn    : 'message-box',
    dataset   : {
      mode : _a.closed
    }
  })

  let buttonLabel = LOCALE.CREATE
  if (_ui_._type == 'member_edit')
    buttonLabel = LOCALE.MODIFY

  const buttons = Preset.ConfirmButtons(_ui_, 
    { 
      confirmLabel  : buttonLabel,
      haptic : 1000,
      cancelService : _e.cancel
    },
    {
      sys_pn  : 'submit-button'
    })

  let a = Skeletons.Box.Y({
    className  : `${formFig}__main`,
    debug      : __filename,
    kids       : [
      Skeletons.Box.Y({
        className  : `${formFig}__container`,
        kids : [
          name,
          email,
          ident,
          mobile,
          address,
          messageBox,
          buttons
        ]
      })
    ]
  })

  return a;
}

export default __skl_widget_member_form