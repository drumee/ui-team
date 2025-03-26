// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *

const __window_conference_topbar = function(_ui_) {
  const media = _ui_.mget(_a.media);
  const opt = _ui_.caller ||  _ui_.callee || {};
  const name = opt.firstname || opt.laststname || opt.fullname;

  const figname = "topbar";
  const actions = [];

  const devices = Skeletons.Box.X({
    sys_pn     : "devices-list"});    
  const attendees = require('./attendees')(_ui_);
  const a = Skeletons.Box.X({
    className : `${_ui_.fig.group}-${figname}__container`,
    sys_pn    : _a.topBar,
    service   : _e.raise,
    debug     : __filename,
    kids : [
      attendees,
      devices,
      Skeletons.Box.X({
        className: `${_ui_.fig.family}__${figname}-title`,
        kids: [
          Skeletons.Note({
            sys_pn    : "ref-window-name",
            uiHandler : _ui_,
            partHandler : _ui_,
            className : "name",
            content   : "Drumee connect"
          })
        ]}),
      Skeletons.Wrapper.Y({
        className : `${_ui_.fig.family}__wrapper--context dialog__wrapper--context`,
        name      : "context",
        uiHandler   : _ui_,
        partHandler : _ui_
      }),

      require('window/skeleton/topbar/control')(_ui_, 'sc')
    ]});
  
  return a;
};
module.exports = __window_conference_topbar;
