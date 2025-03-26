/* ================================================================== *
 * Copyright Xialia.com  2011-2020
 * FILE : /src/drumee/modules/welcome/skeleton/common/button.js
 * TYPE : Skeleton
 * ===================================================================**/

// ===========================================================
//
// ===========================================================
function __skl_welcome_action_button (_ui_, _service, _label = LOCALE.NEXT) {
  const buttonFig = _ui_.fig.family

  const button = Skeletons.Box.X({
    className : `${buttonFig}__row buttons-wrapper buttons no-background`,
    sys_pn    : 'button-wrapper',
    service   : _service,
    uiHandler : [_ui_],
    state     : 0,
    haptic : 500,
    dataset   : {
      error  : 0,
      mode   : _a.open
    },
    kidsOpt   : {
      active : 0
    },
    kids      : [
      Skeletons.Note({
        className  : `${buttonFig}__button-confirm`,
        content    : _label
      })
    ]
  })
  return button;

}

export default __skl_welcome_action_button