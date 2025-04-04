// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : src/drumee/builtins/desk/skeleton/main
//   TYPE : 
// ==================================================================== *


// ===========================================================
//
// ===========================================================
const _desk_main = function(_ui_) {
  const a = Skeletons.Box.Y({
    className : "desk desk--main",
    debug     : __filename,
    // styleOpt  : 
    //   "background-image": "url('#{_ui_.setWallpaper()}')"
    kids: [
      Skeletons.FileSelector({
        partHandler : _ui_}),

      Skeletons.Wrapper.Y({ //Skeletons.Box.Y
        name      : "popup",
        className : `${_ui_.fig.family}__wrapper --modal`, // "desk-general-popup u-jc-center u-ai-center"
        flow      :  _a.none,
        wrapper   : 1,
        uiHandler : _ui_
      }),

      Skeletons.Box.Y({
        uiHandler   : _ui_, 
        className   : `${_ui_.fig.family}__logo-container`,
        service     : 'toggle-fullscreen',
        kids        : [
          Skeletons.Box.X({
            active    : 0,
            className : `${_ui_.fig.family}__logo-item`
          })
        ]}),

      Skeletons.Box.X({
        sys_pn    : "top-bar",
        className : `${_ui_.fig.family}__topbar`,
        // kids      : require('./topbar')(_ui_)
        kids      : [require('desk/skeleton/topbar')(_ui_)]}),
        //uiHandler : _ui_

      Skeletons.Box.Y({
        //sys_pn    : "top-bar"
        sys_pn    : "user-container",
        className : `${_ui_.fig.family}__topbar--user`,
        kids      : [require('desk/skeleton/common/topbar/user')(_ui_)]}),
        //uiHandler : _ui_

      Skeletons.Wrapper.Y({
        name      : "module",
        uiHandler : _ui_,
        className : `u-jc-center absolute ${_ui_.fig.family}__wrapper --module am-wrapper desk-account`
      }),

      Skeletons.Wrapper.Y({
        name      : "chat",
        uiHandler : _ui_,
        className : "desk-chat"
      }),

      Skeletons.Box.X({
        sys_pn    : "desk-wrapper",
        className : "u-jc-center desk-wrapper",
        kids: [{
          kind       : 'window_manager',
          sys_pn     : "desk-content",
          className  : `${_ui_.fig.family}__main-content desk-content`, //"mt-20"
          styleOpt   : {
            width    : window.innerWidth
          } // Must be responsive
          //uiHandler      : _ui_
        }]}),

      Skeletons.Box.Y({
        className  : "desk__tooltip",
        sys_pn     : "desk-tooltip",
        wrapper    : 1
      })
    ]});


  return a;
};
module.exports = _desk_main;
