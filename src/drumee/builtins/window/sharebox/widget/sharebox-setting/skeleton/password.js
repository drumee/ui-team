/* ================================================================== *
 * Copyright Xialia.com  2011-2020
 * FILE : src/drumee/builtins/window/hub/sharebox/skeleton/password.js
 * TYPE : Skelton
 * ===================================================================**/
function __skl_password_setting (_ui_, mode = _a.view) {
  let password = Skeletons.Box.X({
    className  : `${_ui_.fig.family}__password-wrapper`,
    kids: [
      Skeletons.EntryBox({
        className    : `${_ui_.fig.family}__entry`,
        uiHandler    : _ui_,
        service      : '',
        placeholder  : LOCALE.PASSWORD,//'password',
        type         : _a.password,
        sys_pn       : 'password-input',
        autocomplete : _a.off,
        shower       : 1,
        value        : '',
        name         : _a.password,
        formItem    : 'password'
      }),
/*      Skeletons.Button.Svg({
        ico         : 'info',
        className   : `${_ui_.fig.family}__password-info-icon not-verified-status info`,
        tooltips    : {
          content   : 'For security reasons password  should be sent separately: telephone, mail etc',
          className : `${_ui_.fig.family}__tooltips not-verified-status info`
        }
      })*/
    ] 
  })
  let passwordEditRow = Skeletons.Box.X({
    className  : `${_ui_.fig.family}__password-edit-row`,
    kids: [
      password,
      Skeletons.Note({
        className   : `${_ui_.fig.family}__inline-action-btn first`,
        service      : 'save-password',
        content     : "Ok"
      })
    ]
  })
  let passwordViewRow = Skeletons.Box.X({
    className  : `${_ui_.fig.family}__password-view-row`,
    kids: [
      Skeletons.Note({
        className  : `${_ui_.fig.family}__password-view-txt`,
        content: (_ui_.data.hasPaswword) ? '*******' : LOCALE.NO_PASSWORD//'No Password'
      }),
      Skeletons.Button.Svg({
        ico         : "desktop_sharebox_edit",//'editbox_pencil ',
        service     : 'edit-password',
        className   : `${_ui_.fig.family}__inline-edit-icon button btn-first `,
      })
    ]
  })

  let passwordRow = passwordViewRow;
  if(mode == _a.edit){
    passwordRow = passwordEditRow;
  }

  
  return Skeletons.Box.Y({
    className  : `${_ui_.fig.family}__password-holder`,
    kids: [passwordRow]
  });
}
export default __skl_password_setting;