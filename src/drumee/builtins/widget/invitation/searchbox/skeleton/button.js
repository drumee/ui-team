const __skl_invitation_search_button = function(_ui_) {
  const a = Skeletons.Box.X({ 
    className : `${_ui_.fig.family}__conatiner-commands`,
    debug     : __filename,
    sys_pn    : "ref-actions-bar",
    kids :[
      Skeletons.Note({
        className : "ml-15", //"share-popup__modal-btn mt-24"
        uiHandler   : _ui_, 
        service : "add-selection",
        content : LOCALE.SHARE
      })
    ]
  });
  return a;
};
module.exports = __skl_invitation_search_button;
