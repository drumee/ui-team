// ==================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : /src/drumee/builtins/window/helpdesk/skeleton/common/top-bar.js
//   TYPE : Skeleton
// ==================================================================== *

function __skl_window_helpdesk_common_topBar (_ui_) {
  const mode      = _ui_._view;
  const figFamily = `${_ui_.fig.family}-topbar`;
  const figGroup  = `${_ui_.fig.group}-topbar`;

  let title = LOCALE.HELPDESK_TITLE
  switch(Visitor.profile().profile_type){
    case _a.hub:
      title = "Prise en main rapide de Drumee Hub"
      break;
    }

  const windowTitle = Skeletons.Box.X({
    className : `${figFamily}__content ${figGroup}__content topbar-content`,
    kids      : [
      Skeletons.Note({
        className   : 'title',
        sys_pn      : 'window-name',
        content     : title,
        partHandler : _ui_,
        uiHandler   : _ui_,
      })
    ]
  })
    
  const a = Skeletons.Box.X({
    debug     : __filename,
    className : `${figFamily}__container ${figGroup}__container`,
    sys_pn    : _a.topBar,
    service   : _e.raise,
    dataset   : {
      view  : mode
    },
    kids      : [
      windowTitle,
      require('window/skeleton/topbar/control')(_ui_, 'c')
    ]});

  return a;
};

export default __skl_window_helpdesk_common_topBar;
