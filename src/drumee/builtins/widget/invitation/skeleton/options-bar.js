// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *

// ===========================================================
// _search_box
//
// @param [Object] desk_ui
//
// @return [Object] 
//
// ===========================================================

const radio = _.uniqueId("radio-");
const __invitation_options_bar = function(_ui_) {
  let kids;
  const permission =  Skeletons.Button.Svg({
    ico: "desktop__cog", //"desktop_projectroom", 
    className: `${_ui_.fig.group}__container-buttons--option option permission`,
    uiHandler : [_ui_],
    service   : "setup-permission",
    state     : 0
    //radiotoggle: radio #"quick-options-group"
  });
  const message =  Skeletons.Button.Svg({
    ico: "desktop__chat", 
    className   : `${_ui_.fig.group}__container-buttons--option option message`,
    uiHandler   : [_ui_],
    service     : "setup-message",
    state       : 0
    //radiotoggle : radio #"quick-options-group"
  });

  if (_ui_.mget(_a.mode) === 'mini') {
    kids = [message];
  } else {
    kids = [permission, message];
  }

  const a = Skeletons.Box.Y({ 
    className : `${_ui_.fig.group}__container-options mt-10`,
    active    : 0,
    debug     : __filename,
    sys_pn    : "ref-options-bar",
    dataset   : {
      active  : _ui_.getState()
    },
    kids : [ 
      Skeletons.Box.X({
        className : `${_ui_.fig.group}__container-buttons`,
        sys_pn    : "ref-options",
        active    : 0,
        //state     : state
        kids
      }),
      Skeletons.Wrapper.Y({
        name      : "options",
        part      : _ui_,
        className : `${_ui_.fig.family}__wrapper-options`
      })
    ]
  });
  return a;
};
module.exports = __invitation_options_bar;
          // Removed under UX 1.55
          // Skeletons.Button.Svg({
          //   ico       : "desktop_plus",
          //   className : "#{_ui_.fig.group}__icon--plus icon--plus"
          //   sys_pn    : "ref-addbutton"
          //   service   : "new-invitation"
          //   uiHandler     : _ui_ 
          //   state     : _ui_.getState()
          // })
      //     Skeletons.Button.Svg({
      //       ico: "desktop__cog" #"desktop_projectroom", 
      //       className: "#{_ui_.fig.group}__container-buttons--option option"
      //       signal    : _e.ui.event
      //       handler   :
      //         uiHandler   : _ui_
      //       service   : "setup-permission"
      //       radiotoggle: radio #"quick-options-group"
      //     })
      //     Skeletons.Button.Svg({
      //       ico: "desktop__chat", 
      //       className   : "#{_ui_.fig.group}__container-buttons--option option"
      //       signal    : _e.ui.event
      //       handler   :
      //         uiHandler   : _ui_
      //       service     : "setup-message"
      //       radiotoggle : radio #"quick-options-group"
      //     })
      //   ]
      // })
