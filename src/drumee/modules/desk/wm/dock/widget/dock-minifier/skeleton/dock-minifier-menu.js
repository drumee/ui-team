/* ================================================================== *
 * Copyright Xialia.com  2011-2020
 * FILE : /src/drumee/builtins/window/adminpanel/widget/dropdown-menu/js/skeleton/index.js
 * TYPE : Skelton
 * ===================================================================**/


function __skl_widget_minifyDockList (_ui_) {
  const menuFig = `${_ui_.fig.family}`
  const button_class = `${_ui_.fig.family}__button launcher`

  const trigger = Skeletons.Button.Svg({
    ico       : 'dock-minifyer',
    sys_pn    : "dock-minifier-trigger",
    className : `${button_class} conference`,
  });

  const items = Skeletons.Box.X({
    className   : `${menuFig}__docker-menu`,
    sys_pn      : "dock-minifier-panel",
    kids        : [
      Skeletons.List.Smart({
        className     : `${menuFig}__icons-list`,
        innerClass    : `${menuFig}__icons-scroll ${_ui_.fig.group}__icons-scroll`,
        sys_pn        : _a.list,
        flow          : _a.none,
        bubble        : 1,
        timer         : 1000,
        spinnerWait   : 1000,
        spinner       : true,
        signal        : "list:event",
        vendorOpt     : Preset.List.Orange_e,
        itemsOpt   : {
          kind     : 'media_minifyer',
          role     : 'desk',
          signal   : _e.ui.event,
          service  : 'wake-node',
          uiHandler: _ui_,
          on_start : 'wake-node'
        }
      })
    ]
  })

  let a = Skeletons.Box.X({
    debug     : __filename,
    className : `${menuFig}__dropdown ${_ui_.fig.group}__dropdown`,
    kids      : [{
      kind      : KIND.menu.topic,
      className : `${menuFig}__wrapper ${_ui_.fig.group}__wrapper`,
      part      : _ui_ ,
      debug     : __filename ,
      direction : _a.up,
      sys_pn    : "dock-minifier-menu",
      opening   : _e.flyover,
      persistance: _a.always,
      trigger   : trigger,
      items     : items,
      service   : "go-to",
      uiHandler : _ui_,
    }]
  })
  return a;
}

export default __skl_widget_minifyDockList;