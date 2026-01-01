/* ================================================================== *
 * Copyright Xialia.com  2011-2020
 * FILE : /src/drumee/builtins/window/adminpanel/pages/domain-page/skeleton/index.js
 * TYPE : Skelton
 * ===================================================================**/

/*
*
*/
function __skl_domain_page (_ui_) {
  let footer ={};
  let validate_button = Skeletons.Note({
    className   : `${_ui_.fig.family}__button_val input_btn`,
    service     : 'added_domain',
    content     : LOCALE.VALIDATE //"Validate"
  })

  if(_ui_.mode == _a.new)
    footer =  validate_button
  else if(_ui_.mode == _a.view) {
    footer = Skeletons.Note({
      className   : `${_ui_.fig.family}__button_val input_btn`,
      service     : 'edit_domain',
      content     : LOCALE.MODIFY, //"Edit",
      uiHandler : [_ui_]
    })
  } else if(_ui_.mode == _a.edit) {
    footer = Preset.ConfirmButtons(_ui_, {
      cancelLabel     : LOCALE.CANCEL || '',
      cancelService   : 'view_domain',
      confirmLabel    : LOCALE.UPDATE || '',
      confirmService  : 'update_domain'
    })
  }


  let a = Skeletons.Box.Y({
    className  : `${_ui_.fig.family}__main`,
    debug      : __filename,
    kids       : [
      Skeletons.Box.Y({
        className  : `${_ui_.fig.family}__container`,
        kids : [
          Skeletons.Box.X({
            className  : `${_ui_.fig.family}__body`,
            kids: [
              require('./domain').default(_ui_)
            ]
          }),
          Skeletons.Box.X({
            className  : `${_ui_.fig.family}__footer`,
            kids: [
              footer
            ]
          })
        ]
      })
    ]
  })
  return a;
}
export default __skl_domain_page;
