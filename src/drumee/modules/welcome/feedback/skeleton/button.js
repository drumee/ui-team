/* ================================================================== *
 * Copyright Xialia.com  2011-2020
 * FILE : /src/drumee/modules/welcome/reset/skeleton/button.js
 * TYPE : Skeleton
 * ===================================================================**/

// ===========================================================
//
// ===========================================================
function __skl_welcome_reset_button (_ui_, _service, _label = lOCALE.NEXT) {
  const buttonFig = _ui_.fig.family

  const button = Skeletons.Box.X({
    className : `${buttonFig}__buttons-wrapper buttons`,
    sys_pn    : 'button-wrapper',
    service   : _service,
    uiHandler : [_ui_],
    state     : 0,
    dataset   : {
      error  : 0,
      mode   : _a.open
    },
    kidsOpt   : {
      active : 0
    },
    kids      : [
      Skeletons.Note({
        sys_pn     : 'btn-action',
        partHandler: [_ui_],
        className  : `${buttonFig}__btn`,
        content    : _label
      })
    ]
  })


  return button;

}

export default __skl_welcome_reset_button