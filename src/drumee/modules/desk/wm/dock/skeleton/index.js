const __desk_dock = function(ui) {
  const pfx = ui.fig.family;
  
  const navButton = Skeletons.Box.X({
    debug: __filename,
    className: `${ui.fig.family}__container nav-container ${ui.fig.family}--divider-right`,
    kids: [
      Skeletons.Button.Svg({
        ico: 'dock-nav',
        className: `${pfx}__button nav`,
        service: _e.launch,
        sys_pn: 'dock-nav-button',
        uiHandler: ui,
        tooltips: {
          className: `${ui.fig.family}__tooltips ${ui.fig.name}-tooltips`,
          content: LOCALE.NAV
        }
      })
    ]
  });``
  
  const trash = Skeletons.Box.X({
    debug     : __filename,
    className   : `${ui.fig.family}__container trash-container ${ui.fig.family}--divider-left`,
    kids : [
      Skeletons.Button.Svg({
        ico       : 'dock-trash',
        className : `${pfx}__button trash`, 
        service   : _e.trash,
        sys_pn    : "trash-bin",
        uiHandler : ui,
        tooltips  : { 
          className : `${ui.fig.family}__tooltips ${ui.fig.name}-tooltips`,
          content : LOCALE.BASKET
        }
      })
    ]});

  const a = Skeletons.Box.X({
    className  : `${pfx}__main`,
    sys_pn     : "dock-container",
    debug     : __filename,
    kids: [
      navButton,
      // require('./minifier').default(ui),
      // require('./mobile')(ui),
      require('./maker')(ui),
      require('./launcher')(ui),
      trash
    ]});



  return a;
};
module.exports = __desk_dock;
