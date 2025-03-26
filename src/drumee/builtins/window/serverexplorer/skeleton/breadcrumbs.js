// ==================================================================== *
//   Copyright Xialia.com  2011-2023
//   FILE : /ui/src/drumee/builtins/window/serverexplorer/skeleton/breadcrumbs.coffee
//   TYPE : Skeleton
// ==================================================================== *

const __topbar_breadcrumbs = function(_ui_) {

  const name = "breadcrumbs";

  const trigger = Skeletons.Button.Icon({
    ico       : "arrow-to-l",
    className : `${_ui_.fig.group}-${name}__icon ${_ui_.fig.group}-${name}__arrow ml-12`,
    service   : "previous",
    uiHandler : _ui_, 
    sys_pn    : "breadcrumbs-previous",
    state     : 0
  }, {
    width   : 20,
    height  : 20,
    padding : 5
  });

  const items = Skeletons.List.Smart({
    className   : `${_ui_.fig.group}-${name}__roll`,
    sys_pn      : "breadcrumbs-roll",
    styleOpt    : {
      width     : 150
    },
      //height    : 200
    partHandler : _ui_,
    //uiHandler   : _ui_
    autoHeight  : Preset.List.y36_36_216,
    vendorOpt   : Preset.List.Orange_e
  });

  const menu = {
    kind      : KIND.menu.topic,
    className : `${_ui_.fig.group}-${name}__main`,
    part      : _ui_, 
    debug     : __filename, 
    sys_pn    : "breadcrumbs",
    callback  : _ui_.adjustBreadcrumbs.bind(_ui_),
    opening   : _e.flyover,
    trigger,
    items,
    service   : "go-to",
    uiHandler : _ui_
  };
    // offsetY   : 44
    // direction : 'downward'

  const a = Skeletons.Box.Y({
    debug       : __filename, 
    className   : `${_ui_.fig.group}-${name}__container`,
    sys_pn      : "breadcrumbs-container",
    partHandler : _ui_,
    state       : 0
  });

  if (Visitor.isOnline() || Visitor.inDmz) {
    a.kids = [menu];
  }

  return a;
};

module.exports = __topbar_breadcrumbs;
