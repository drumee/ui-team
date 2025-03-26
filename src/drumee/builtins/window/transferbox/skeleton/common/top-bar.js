// ==================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/window/adminpanel/skeleton/common/top-bar.js
//   TYPE : Skeleton
// ==================================================================== *

const __skl_admin_panel_common_topBar = function(_ui_) {

  const mode      = _ui_._view;
  const tobBarFig = `${_ui_.fig.family}-topbar`;
  const figGroup  = `${_ui_.fig.group}-topbar`;
    
  const outbound = Skeletons.Button.Svg({
    ico       : 'transferbox-sharing',
    className : `${tobBarFig}__icon switch-box outbound`,
    type      : _a.outbound,
    service   : 'switch-box',
    radio     : 'transfer-switcher-radio',
    // state     : 1,
    uiHandler : _ui_,
  })

  const inbound = Skeletons.Button.Svg({
    ico       : 'transferbox-shared',
    className : `${tobBarFig}__icon switch-box inbound`,
    type      : _a.inbound,
    service   : 'switch-box',
    radio     : 'transfer-switcher-radio',
    // state     : 0,
    uiHandler : _ui_,
  })
  
  // const  notifier  = Skeletons.Box.X({
  //   className  : `${tobBarFig}__notifier`,
  //     sys_pn    : 'notifier',
  //     signal    : _e.ui.event,
  //     service   : 'inbound-notification',
  //     uiHandler : _ui_,
  //     state     : 0,
  //     toggle    : _.uniqueId()
  // })

  const a = Skeletons.Box.X({
    className : `${tobBarFig}__container ${figGroup}__container`,
    sys_pn    : _a.topBar,
    service   : _e.raise,
    dataset   : {
      view  : mode
    },
    debug     : __filename,
    kids      : [
      require('window/skeleton/topbar/breadcrumbs')(_ui_),
      Skeletons.Box.X({
        className  : `${tobBarFig}__switch-container`,
        kids: [
          outbound,
          inbound,
          // notifier
        ]
      }),

      Skeletons.Box.X({
        className : `${tobBarFig}__wrapper-title topbar-content`,
        kids      : [
          Skeletons.Note({
            className   : `${tobBarFig}__note title`,
            sys_pn      : 'window-name',
            content     : 'Transfer Box'
          }),

          require('./action-menu').default(_ui_)
        ]}),

      require('window/skeleton/topbar/control')(_ui_, 'vsc')
    
    ]});

  return a;

};

export default __skl_admin_panel_common_topBar;
