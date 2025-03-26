// ==================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : builins/window/contact/skeleton/top-bar
//   TYPE : Skeleton
// ==================================================================== *

const __skl_window_contact_topBar = function(_ui_) {
  this.debug("__skl_window_contact_topBar", _ui_);

  const name =  _ui_.getCurrentLabel() ||  "???";
  
  const figname = "topbar";
  const a = Skeletons.Box.X({
    className : `${_ui_.fig.group}-${figname}__container ${_ui_.mget(_a.area)}`,
    sys_pn    : _a.topBar,
    service   : _e.raise,
    debug     : __filename,
    kids : [
      Skeletons.Box.X({
        className: `${_ui_.fig.group}-${figname}__title`,
        kids: [
          Skeletons.Note({
            sys_pn    : "ref-window-name",
            uiHandler : _ui_,
            partHandler : _ui_,
            className : "name",
            content   : LOCALE.INVITE_CONTACT_TO_NETWORK
          })//name
        ]}),

      require('window/skeleton/topbar/control')(_ui_,'c')
    ]});

  return a;
};

module.exports = __skl_window_contact_topBar;
