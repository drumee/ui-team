// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *


// ===========================================================
// __desk_skl_confirm_remove
//

//
// ===========================================================
const __desk_skl_confirm_remove = function(_ui_, message) {
  message = message || `All elements in trash bin will be definitely deleted! <b> \
Are you sure ?`;
  const a = Skeletons.Box.Y({
    debug     : __filename,
    className : `${_ui_.fig.group}-popup__container`,
    kids      : [
      Skeletons.Note(message, `${_ui_.fig.group}-popup__title`),
      Skeletons.Box.X({
        justify:_a.center,
        className:`${_ui_.fig.group}-popup__button`,//btn-block u-jc-sb"
        kids:[
          Skeletons.Note({
            className :'btn btn--regular',
            content   : LOCALE.CANCEL,
            service   : "close-dialog",
            uiHandler     : _ui_
          }),
          Skeletons.Note({
            className :'btn btn--warning',
            content   : LOCALE.DELETE,
            service   : "confirm:remove",
            uiHandler     : _ui_
          })
        ]
      })
    ]});
  return a;
};
module.exports = __desk_skl_confirm_remove;
