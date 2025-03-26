// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : src/drumee/builtins/desk/skeleton/top-bar/main
//   TYPE : 
// ==================================================================== *

const __desk_topbar_mobile_main = function(_ui_) {
  const pfx = `${_ui_.fig.group}-topbar`;

  const _logo_menu_trigger = Skeletons.Box.X({
    uiHandler   : _ui_, 
    className   : "c-top-bar__logo c-top-bar__logo--white top-bar__logo", //top-bar__logo is temp do not remove, i's png colored logo
    service     : "raise-error",
    useKeyEvent : 1
    // href      : _K.module.desk + "/raise-error"
  });

  // a = Skeletons.Box.X({
  //   debug     : __filename
  //   className : "#{pfx}__main"
  //   #uiHandler : _ui_
  //   active    : 0
  //   kids      : [
  //     Skeletons.Box.Y({
  //       className: "#{pfx}__left"
  //       kids: [
  //         _logo_menu_trigger
  //       ]
  //     })
  //     Skeletons.Box.Y({
  //       active      : 0
  //       className: "#{pfx}__center" #"desk__header u-ai-center"
  //       kids: require('./main-menu')(_ui_)
  //     })
  //     Skeletons.Box.Y({
  //       className: "u-jc-start #{pfx}__right"
  //     })
  //   ]
  // })
  const a = [
    Skeletons.Box.Y({
      className: `${pfx}__left`,
      kids: [
        _logo_menu_trigger
      ]
    }),
    Skeletons.Box.Y({
      active      : 0,
      className: `${pfx}__center`, //"desk__header u-ai-center"
      kids: require('./main-menu')(_ui_)
    }),
    Skeletons.Box.Y({
      className: `u-jc-start ${pfx}__right`
    })
  ];

  return a;
};

module.exports = __desk_topbar_mobile_main;
