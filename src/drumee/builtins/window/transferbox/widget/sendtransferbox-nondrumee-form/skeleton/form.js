/* ================================================================== *
 * Copyright Xialia.com  2011-2021
 * FILE : src/drumee/builtins/window/transferbox/widget/sendtransferbox-nondrumee-form/skeleton/index.js
 * TYPE : Skeleton
 * ===================================================================**/

// ===========================================================
//
// ===========================================================
function __skl_nondrumeete_form  (_ui_) {

  /* Email Input */
  const emailValidator = [      
    {reason: 'Email is required' , comply: Validator.require},
    {reason: 'Please Enter the valid Email' , comply: Validator.email},
  ]

  var emailInput = Skeletons.EntryBox({
    className   : `${_ui_.fig.family}__entry form-input`,
    formItem    : 'email',
    placeholder : 'Email',
    value       : '',
    errorHandler  : [_ui_],
    validators    : emailValidator,
    showError   : true,
    sys_pn      : 'email-entry',
    preselect   : 1,
  })

  const emailRow = Skeletons.Box.X({
    className  : `${_ui_.fig.family}__form_row`,
    kids : [
      // Skeletons.Note({
      //   className  : `${_ui_.fig.family}__row_label`,
      //   content: 'Email'
      // }),
      Skeletons.Box.X({
        className  : `${_ui_.fig.family}__row_form_field`,
        kids: [
          emailInput
        ]
      })
    ]
  });


  /* Message Input */
  const messageValidator = [      
    {reason: 'Message is required' , comply: Validator.require},
  ]

  var messageInput = Skeletons.EntryBox({
    className   : `${_ui_.fig.family}__entry form-input`,
    formItem    : 'message',
    placeholder : 'Message',
    value       : '',
    errorHandler  : [_ui_],
    // validators    : messageValidator,
    showError   : true,
    sys_pn      : 'message-entry'
  })

  const messageRow = Skeletons.Box.X({
    className  : `${_ui_.fig.family}__form_row`,
    kids : [
      // Skeletons.Note({
      //   className  : `${_ui_.fig.family}__row_label`,
      //   content: 'Message'
      // }),
      Skeletons.Box.X({
        className  : `${_ui_.fig.family}__row_form_field`,
        kids: [
          messageInput
        ]
      })
    ]
  });

  let footer = Preset.ConfirmButtons(_ui_, {
    cancelLabel     : LOCALE.CANCEL || '',
    cancelService   : 'close-model',
    confirmLabel    : LOCALE.UPDATE || '',
    confirmService  : 'send-files'
  })


  
  let a = Skeletons.Box.Y({
    className  : `${_ui_.fig.family}__form-wrapper`,
    debug      : __filename,
    kids       : [
      Skeletons.Box.Y({
        className  : `${_ui_.fig.family}__element-wrapper`,
        kids: [
          emailRow,
          messageRow,
        ]
      }),
      Skeletons.Box.X({
        className  : `${_ui_.fig.family}__footer-actions`,
        kids: [
          footer
        ]
      })
    ]
  })

  return a;
}

export default __skl_nondrumeete_form;