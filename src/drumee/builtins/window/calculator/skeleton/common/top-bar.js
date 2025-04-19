// ==================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/window/adminpanel/skeleton/common/top-bar.js
//   TYPE : Skeleton
// ==================================================================== *

const __skl_calculator_common_topBar = (_ui_) => {
  const figFamily = `${_ui_.fig.family}-topbar`;
  const figGroup = `${_ui_.fig.group}-topbar`;
  const windowTitle = "Calculator";

  return Skeletons.Box.X({
    className: `${figFamily}__container ${figGroup}__container`,
    sys_pn: _a.topBar,
    service: _e.raise,   
    debug: __filename,
    kids: [
      Skeletons.Box.X({
        className: `${figFamily}__content ${figGroup}__content topbar-content`,
        kids: [
          Skeletons.Note({
            className: 'title',
            sys_pn: 'window-name',
            content: windowTitle,
            partHandler: _ui_,
            uiHandler: _ui_,
          })
        ]
      }),
      require('window/skeleton/topbar/control')(_ui_, 'c')
    ]
  });
};

export default __skl_calculator_common_topBar;
