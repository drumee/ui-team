// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *

// ===========================================================
//
// @return [Object] 
//
// ===========================================================
const __inv_actions_bar = function(_ui_) {
  const a =  
  Skeletons.Box.X({ 
    className : `${_ui_.fig.group}__container-commands share-popup__modal-btn-group mb-22 mt-16`,
    debug     : __filename,
    sys_pn    : "ref-actions-bar-footer",
    kids :[
      Skeletons.Note({
        className : `${_ui_.fig.group}__container--secondary-btn`, //"share-popup__modal-btn mt-24"
        uiHandler : [_ui_], 
        service   : 'cancel-share',
        editable  : 1,
        content   : LOCALE.CANCEL //SHARE
      }),
       Skeletons.Box.X({ 
        className : "",
        debug     : __filename,
        sys_pn    : "ref-actions-bar",
        dataset   : {
          active  : _ui_.getState()
        },
        kids :[
          Skeletons.Note({
            className : "dialog__button--submit", //"share-popup__modal-btn mt-24"
            uiHandler : _ui_, 
            service   :  _e.share,
            editable  : 1,
            content   : LOCALE.SAVE //SHARE
          })
        ]
       })
    ]
  });
  return a;
};
module.exports = __inv_actions_bar;
