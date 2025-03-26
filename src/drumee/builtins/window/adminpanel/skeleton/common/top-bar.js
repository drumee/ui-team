// ==================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/window/adminpanel/skeleton/common/top-bar.js
//   TYPE : Skeleton
// ==================================================================== *

const __skl_admin_panel_common_topBar = function(_ui_) {

  const mode      = _ui_._view;
  const figFamily = `${_ui_.fig.family}-topbar`;
  const figGroup  = `${_ui_.fig.group}-topbar`;
  
  let windowTitle = LOCALE.ADMIN;
  if (_ui_.organisation && _ui_.organisation.name) {
    windowTitle     = (_ui_.organisation.name.printf(LOCALE.ADMINISTRATION_OF)) //
  }
  
  const a = Skeletons.Box.X({
    className : `${figFamily}__container ${figGroup}__container`,
    sys_pn    : _a.topBar,
    service   : _e.raise,
    dataset   : {
      view  : mode
    },
    debug     : __filename,
    kids      : [
      Skeletons.Box.X({
        className : `${_ui_.fig.family}__page-dropdown`,
        sys_pn    :  'page_dropdown',
        kids      : [
          require('../common/dropdown').default(_ui_)
        ]
      }),

      require('./search').default(_ui_),

      Skeletons.Box.X({
        className : `${figFamily}__content ${figGroup}__content topbar-content`,
        kids      : [
          Skeletons.Note({
            className   : 'title',
            sys_pn      : 'window-name',
            content     : windowTitle,
            partHandler : _ui_,
            uiHandler   : _ui_,
          })
        ]}),

      require('window/skeleton/topbar/control')(_ui_, 'sc')
    
    ]});

  return a;
};

export default __skl_admin_panel_common_topBar;
