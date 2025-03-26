// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *

const __conference_invitation_topbar = function(_ui_) {
  const media = _ui_.mget(_a.media);
  let name = _ui_.model.get(_a.filename) || "";
  name = LOCALE.EXTERNAL_MEETING;

  const figname = "topbar";
  const actions = [];

  const a = Skeletons.Box.X({
    className : `${_ui_.fig.group}-${figname}__container`,
    sys_pn    : _a.topBar,
    service   : _e.raise,
    debug     : __filename,
    kids : [
      Skeletons.Box.X({
        className: `${_ui_.fig.family}__${figname}-title`,
        kids: [
          Skeletons.Note({
            sys_pn    : "ref-window-name",
            uiHandler : _ui_,
            partHandler : _ui_,
            className : "name",
            content   : name
          })
        ]}),
      Skeletons.Wrapper.Y({
        className : `${_ui_.fig.family}__wrapper--context dialog__wrapper--context`,
        name      : "context",
        uiHandler   : _ui_,
        partHandler : _ui_
      }),

      require('window/skeleton/topbar/control')(_ui_,'sc')
    ]});
  return a;
};
module.exports = __conference_invitation_topbar;
