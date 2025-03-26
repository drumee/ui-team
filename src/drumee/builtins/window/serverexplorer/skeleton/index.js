// ==================================================================== *
//   Copyright Xialia.com  2011-2023
//   FILE : /ui/src/drumee/builtins/window/serverexplorer/skeleton/index.js
//   TYPE : Skeleton
// ==================================================================== *

const __skl_serverexplorer_main = function(_ui_) {

  const menu = Skeletons.Box.X({
    debug     : __filename,
    className : `${_ui_.fig.family}__header ${_ui_.fig.group}__header`, 
    kidsOpt   : {
      radio     : _a.on,
      signal    :_e.ui.event,
      uiHandler : _ui_
    },
    kids       : [require('./top-bar')(_ui_)],
    service   : _e.raise
  });

  const tooltips =  Skeletons.Wrapper.Y({
    className : `${_ui_.fig.group}__wrapper-container`,
    name      :  "tooltips"
  });

  const body = Skeletons.Box.Y({
    className : `${_ui_.fig.family}__body ${_ui_.fig.group}__body`,
    sys_pn    : _a.content,
    type      : _ui_.type
  });

  const overlayWrapper = require('./overlay-wrapper').default(_ui_);

  const footer = Skeletons.Box.X({
    className : `${_ui_.fig.family}__footer ${_ui_.fig.group}__footer`,
    sys_pn    : _a.footer,
    type      : _ui_.type,
    kids      : [require('./footer').default(_ui_)]});

  const a = Skeletons.Box.Y({
    className  : `${_ui_.fig.family}__main ${_ui_.fig.group}__main drive-popup`,
    radio      : _a.parent,
    debug      : __filename,
    kids       : [menu, tooltips, body, overlayWrapper, footer]});
  
  return a;
};

export default __skl_serverexplorer_main;
