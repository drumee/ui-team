/* ================================================================== *
 * Copyright Xialia.com  2011-2020
 * FILE : src/drumee/builtins/window/sharebox/widget/invitation-email/skeleton/email-input.js
 * TYPE : Skelton
 * ===================================================================**/

function __skl_email_input (_ui_){
    const emailValidator = [      
      // {reason: LOCALE.ENTER_A_VALID_EMAIL , comply: Validator.email},//'Enter the valid Email'
    ]
    var emailInput = Skeletons.EntryBox({
      className     : `${_ui_.fig.family}__entry form-input`,
      formItem      : 'email',
      placeholder   : LOCALE.EMAIL,//'Email',
      type          : _a.textarea,
      service       : 'email-input',
      preselect     : _ui_.mget(_a.preselect) || 0,
      mode          : _a.interactive,
      uiHandler     : [_ui_],
      autocomplete  : _a.off,
      errorHandler  : [_ui_],
      validators    : emailValidator,
      showError     : true,
      sys_pn        : 'email-entry'
    })
  

  const emailrow = Skeletons.Box.X({
    className  : `${_ui_.fig.family}__email-form_row`,
    kids : [
      Skeletons.Box.X({
        className  : `${_ui_.fig.family }__row_form_field`,
        kids: [
          emailInput
        ]
      }),
      Skeletons.Box.X({
        className  : `${_ui_.fig.family}__sufix`,
        kids: [
          Skeletons.Button.Svg({
            ico       : 'desktop_plus',
            className : `${_ui_.fig.family}__icon add-email-plus desktop_plus`,
            sys_pn      : `add-email-button`,
            service     : `add-email-to-contacts`,
            uiHandler : _ui_,
            dataset     : {
              state     : _a.closed
            },
          }),
          // Skeletons.Note({
          //   className   : `${_ui_.fig.family}__ok_button`,
          //   content     : LOCALE.ADD,//"Ok",
          //   sys_pn      : `add-email-button`,
          //   service     : `add-email-to-contacts`,
          //   dataset     : {
          //     state     : _a.closed
          //   }
          // }),
          Skeletons.Button.Svg({
            ico       : 'desktop_contactbook',
            className : `${_ui_.fig.family}__icon contact-book`,
            sys_pn    : `contact-book-icon`,
            service   : `open-contacts`,
          })
        ]
      })
    ]
  });

  const suggestions = Skeletons.Wrapper.Y({
    className   : `${_ui_.fig.family}__suggestion_wrapper`,
    sys_pn      : `suggestion-wrapper`, 
    kids: []
  })



  let a = Skeletons.Box.Y({
    className  : `${_ui_.fig.family}__email-input_form `,
    debug      : __filename,
    kids       : [
      emailrow,
      suggestions,
      // { 
      //   kind      : 'invitation_search',
      //   placeholder   : LOCALE.EMAIL,
      //   api         : _ui_.getSearchApi(),
      //   apiAll      : _ui_.getAllApi(),
      // }
    ]
  })
  return a;
}
export default __skl_email_input;