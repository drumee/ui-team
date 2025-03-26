
/* ================================================================== *
 * Copyright Xialia.com  2011-2023
 * FILE : src/drumee/modules/setup/skeleton/form-layout.js
 * TYPE : Skelton
 * ===================================================================**/

// ===========================================================
//
// ===========================================================
function __skl_widget_setup  (_ui_) {
  const formFig = _ui_.fig.family 

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
            value         : "",
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
            value         : "",
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
        value       : "",
        uiHandler     : _ui_,
        errorHandler  : [_ui_],
        validators    : emailValidators,
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
            value         : "",
            uiHandler     : _ui_,
            errorHandler  : [_ui_],
            showError     : 1,
            // validators    : [
            //   { reason: LOCALE.AREA_CODE_REQUIRED , comply: Validator.require }
            // ],
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
        value         : "",
        uiHandler     : _ui_,
        errorHandler  : [_ui_],
        showError     : 1,
        validators    : [
          // { reason: LOCALE.PHONE_NUMBER_REQUIRED, comply: Validator.require },
          { reason: LOCALE.VALID_PHONE_NO , comply: Validator.phone }
        ],
      })
    ]
  })

  const password = Skeletons.Box.X({
    className   : `${formFig}__wrapper password`,
    kids        : [
      Skeletons.Button.Svg({
        ico         : 'lock',
        className   : `${formFig}__icon password`
      }),

      Skeletons.EntryBox({
        className   : `${formFig}__entry password`,
        formItem    : _a.password,
        innerClass  : _a.password,
        type        : _a.password,
        interactive : 1,
        sys_pn      : 'password-input',
        placeholder : LOCALE.PASSWORD,
        value       : "",
        uiHandler     : _ui_,
        errorHandler  : [_ui_],
        showError     : 1,
        validators    : [
          { reason: "Password is Requred ", comply: Validator.require }
        ],
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
        value         : "",
        uiHandler     : _ui_,
        errorHandler  : [_ui_],
        validators    : [
          { reason: LOCALE.ERR_ID_REQUIRED, comply: Validator.require }
        ],
        showError     : 1
      }),
    ]
  })

  let saveBtn = Skeletons.Note({
    className   : `${_ui_.fig.family}__action-button save`,
    service     : 'save-admin-details',
    content     : LOCALE.SAVE ,
    uiHandler     : [_ui_]
  })

  let a = Skeletons.Box.Y({
    className : `${_ui_.fig.family}__content-wrapper`,
    debug     : __filename,  
    kids      : [
      Skeletons.Box.X({
        className : `${_ui_.fig.family}__header-wrapper`,
        sys_pn    : 'header',
        kids:[
          Skeletons.Note({
            className  : `${_ui_.fig.family}__header-content`,
            content: "Admin Settings "
          })
        ]
      }),
      Skeletons.Box.Y({
        className : `${_ui_.fig.family}__body`,
        kids      : [
          name,
          ident,
          email,
          // mobile,
          password,
          saveBtn
        ],
        sys_pn    : 'ref-body-content'
      })
    ]
  });

  return a;
}

export default __skl_widget_setup