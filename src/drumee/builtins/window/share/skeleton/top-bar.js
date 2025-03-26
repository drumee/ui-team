// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : /src/drumee/builtins/window/share/skeleton/top-bar.coffee
//   TYPE : Skeleton
// ==================================================================== *

// ===========================================================
// __transferbox_top_bar
//
// @param [Object] _ui_
//
// @return [Object]
//
// ===========================================================
const __transferbox_top_bar = function(_ui_) {

  const headerFig = `${_ui_.fig.family}-header`;

  const outbound = Skeletons.Button.Svg({
    ico       : 'transferbox-sharing',
    className : `${headerFig}__icon switch-box outbound`,
    type      : _a.outbound,
    service   : 'switch-box',
    radio     : 'transfer-switcher',
    state     : _ui_.switcher ? 0 : 1,
    uiHandler : _ui_
  });
  
  const inbound = Skeletons.Button.Svg({
    ico       : 'transferbox-shared',
    className : `${headerFig}__icon switch-box inbound`,
    type      : _a.inbound,
    service   : 'switch-box',
    radio     : 'transfer-switcher',
    state     : _ui_.switcher ? 1 : 0,
    uiHandler : _ui_
  });


  const notifier  = {
    kind      : KIND.box, 
    className : `${_ui_.fig.group}__notifier`,
    sys_pn    : 'notifier',
    signal    : _e.ui.event,
    service   : 'inbound-notification',
    uiHandler : _ui_,
    state     : 0,
    toggle    : _.uniqueId()
  };

  const a = Skeletons.Box.X({
    className : `${headerFig}__container share u-jc-sb`,
    sys_pn    : 'browser-top-bar',
    service   : _e.raise,
    debug     : __filename,
    kids : [
      require('window/skeleton/topbar/breadcrumbs')(_ui_),

      Skeletons.Box.X({
        className : `${headerFig}__switch-container u-ai-center`,
        kids      : [
          outbound,
          inbound,
          notifier
        ]}),

      Skeletons.Box.X({
        className : `${headerFig}__wrapper-title`,
        kids      : [
          Skeletons.Note({
            className: `${headerFig}__note title`,
            content: 'Transfer box'
          }),
          
          require('./action-menu')(_ui_)
        ]}),
      
      require('window/skeleton/topbar/control')(_ui_)
    ]});

  return a;
};

module.exports = __transferbox_top_bar;
