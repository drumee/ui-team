// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *


// ===========================================================
// __skl_trash_topbar
//
// @param [Object] _ui_
//
// @return [Object]
//
// ===========================================================
const __skl_trash_topbar = function(_ui_) {
  const figname = "topbar";
  const a = Skeletons.Box.X({
    className : `${_ui_.fig.family}-${figname}__container u-jc-sb`,
    sys_pn    : "browser-top-bar",
    debug     : __filename,
    service   : _e.raise,
    kids : [
      !Visitor.isMimicActiveUser() ?
        Skeletons.Box.X({ 
          className : `${_ui_.fig.family}-${figname}__title purge`,
          kids: [
            Skeletons.Note({
              content   : LOCALE.PURGE,
              className : "purge",
              service   : "empty-bin",
              uiHandler     : _ui_
            }) 
          ]}) : undefined,

      Skeletons.Box.X({
        className: `${_ui_.fig.family}-${figname}__title u-ai-center`,
        kids :[
          Skeletons.Note(LOCALE.ARCHIVES), //"archive"
        ]}),
      require('window/skeleton/topbar/control')(_ui_)
    ]});

  return a;
};
module.exports = __skl_trash_topbar;
