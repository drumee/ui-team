/* ================================================================== *
 * Copyright Xialia.com  2011-2020
 * FILE : /src/drumee/builtins/window/adminpanel/pages/domain-page/skeleton/index.js
 * TYPE : Skelton
 * ===================================================================**/

function __skl_domain_form (_ui_){
  let org = _ui_.organisation

  if(_ui_.mode == _a.view){
    var nameInput = Skeletons.Note({
      className  : `${_ui_.fig.family}__input_display`,
      content: org.name
    })
  }else{
    const nameValidator = [      
      {reason: LOCALE.COMPANY_NAME_REQUIRED , comply: Validator.require}
    ]
    var nameInput = Skeletons.EntryBox({
      className   : `${_ui_.fig.family}__entry form-input`,
      formItem    : 'name',
      placeholder : LOCALE.ORGANISATION_NAME,//'Organisation name',
      value       : org.name || '',
      errorHandler  : [_ui_],
      validators    : nameValidator,
      showError   : true,
      sys_pn      : 'name-entry'
    })
  }

  const name = Skeletons.Box.X({
    className  : `${_ui_.fig.family}__form_row`,
    kids : [
      Skeletons.Note({
        className  : `${_ui_.fig.family}__row_label`,
        content: LOCALE.ORGA_NAME  // "Organisation name" + ":"
      }),
      Skeletons.Box.X({
        className  : `${_ui_.fig.family}__row_form_field`,
        kids: [
          nameInput
        ]
      })
    ]
  });

  if(_ui_.mode == _a.new){
    const identValidator = [      
      {reason: "Ident is require" , comply: Validator.require}, 
      {reason: "Enter a valid ident" , comply: Validator.ident}, 
    ]
    var identInput = Skeletons.EntryBox({
      className   : `${_ui_.fig.family}__entry form-input`,
      formItem    : 'ident',
      placeholder : LOCALE.IDENT, //'Ident',
      value       : '',
      errorHandler  : [_ui_],
      validators    : identValidator,
      showError   : true,
      sys_pn      : 'ident-entry'
    })
  }else{
    var identInput = Skeletons.Note({
      className  : `${_ui_.fig.family}__input_display`,
      content: org.ident
    })

  }

  
  
  const ident = Skeletons.Box.X({
    className  : `${_ui_.fig.family}__form_row`,
    kids : [
      Skeletons.Note({
        className  : `${_ui_.fig.family}__row_label`,
        content: LOCALE.ORGANISATION_IDENT //"Organisation Ident" + ":"
      }),
      Skeletons.Box.X({
        className  : `${_ui_.fig.family}__row_form_field`,
        kids: [
          identInput
        ]
      })
    ]
  });
  var linkText = ''
  if(_ui_.mode == _a.new){
    linkText = LOCALE.LINK_NOT_CREATED; //'Link has not been created yet';
  }else{
    linkText = `${protocol}://` + org.link; 
  }


  const link = Skeletons.Box.X({
    className  : `${_ui_.fig.family}__form_row`,
    kids : [
      Skeletons.Note({
        className  : `${_ui_.fig.family}__row_label`,
        content: LOCALE.ACCESS_LINK //"Access link" + ":"
      }),
      Skeletons.Box.X({
        className  : `${_ui_.fig.family}__row_form_field`,
        sys_pn: "ack-clipboard",
        kids: [
          Skeletons.Note({
            className  : `${_ui_.fig.family}__link_display ${_ui_.mode}`,
            content: linkText,
            service : 'copy-link'
          })
        ]
      })
    ]
  });



  let a = Skeletons.Box.Y({
    className  : `${_ui_.fig.family}__domain_form mode_${_ui_.mode}`,
    debug      : __filename,
    kids       : [
      name,
      ident,
      link,
      // buttons
    ]
  })
  return a;
}
export default __skl_domain_form;