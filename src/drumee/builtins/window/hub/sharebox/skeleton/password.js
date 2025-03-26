/* ================================================================== *
 * Copyright Xialia.com  2011-2020
 * FILE : src/drumee/builtins/window/hub/sharebox/skeleton/password.js
 * TYPE : Skelton
 * ===================================================================**/
function __skl_password_setting (_ui_) {
  let a;
  a = Skeletons.Box.Y({
    className  : `${_ui_.fig.family}__password-wrapper`,
    kids: [
      Skeletons.Note({
        className   : `${_ui_.fig.family}__option-title`,
        content     : LOCALE.PASSWORD
      }),
      Skeletons.Box.X ({
        className  : `${_ui_.fig.family}__password_row`,
        kids: [
          Skeletons.EntryBox({
            className    : `${_ui_.fig.family}__entry`,
            uiHandler    : _ui_,
            service      : '',
            placeholder  : LOCALE.PASSWORD,//'password',
            type         : _a.password,
            sys_pn       : 'password-input',
            // mode         : opt.mode || _a.interactive,
            autocomplete : _a.off,
            shower       : 1,
            value        : '',
            name         : _a.password,
            formItem    : 'password'
          }),
          Skeletons.Button.Svg({
            ico         : 'info',
            className   : `${_ui_.fig.family}__password-info-icon not-verified-status info`,
            tooltips    : {
              content   : LOCALE.REASONS_PASSWORD_SENT_SEPARATELY,//'For security reasons password  should be sent separately: telephone, mail etc',
              className : `${_ui_.fig.family}__tooltips not-verified-status info`
            }
          })
        ]
      })
    ] 
  })
  return a;
}
export default __skl_password_setting;