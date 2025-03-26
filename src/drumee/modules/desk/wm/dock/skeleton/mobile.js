const __dock_widget_mobile_launchers = function(_ui_) {
  let menu;
  let profileType = 'pro';
  if (Visitor.isHubUser()) {
    profileType = _a.hub;
  }

  const button_class = `${_ui_.fig.family}__button launcher ${profileType}`;
  const pfx = _ui_.fig.family; 
  const menuFig = `${_ui_.fig.family}`;

  const mobileLauncherTrigger =  Skeletons.Button.Svg({
    ico       : 'lines',
    className : `${button_class} mobile-launcher tbd ${profileType}`
  });
  

  const mobileLauncherItems = Skeletons.Box.X({
    className   : `${menuFig}__docker-menu ${profileType}`,
    sys_pn      : "dock-minifier-panel",
    kids        : [
      require('./maker')(_ui_),
      require('./launcher')(_ui_)
    ]});
  
  const a = Skeletons.Box.X({
    debug     : __filename,
    className   : `${pfx}__container mobile-launcher ${profileType}`,
    kids: [
      (menu = { 
        kind      : KIND.menu.topic,
        className : `${menuFig}__mobile-launch-wrapper ${_ui_.fig.group}__mobile-launch-wrapper ${profileType}`,
        part      : _ui_, 
        debug     : __filename, 
        direction : _a.up,
        sys_pn    : "dock-minifier-menu",
        opening   : _e.flyover,
        persistance: _a.always,
        trigger   : mobileLauncherTrigger,
        items     : mobileLauncherItems,
        service   : "go-to",
        uiHandler : _ui_
      })       
    ]});
  
  return a;
};

module.exports = __dock_widget_mobile_launchers;
