const __desk_dock = function(_ui_) {
  const pfx = _ui_.fig.family;
  
  const navButton = Skeletons.Box.X({
    debug: __filename,
    className: `${_ui_.fig.family}__container nav-container ${_ui_.fig.family}--divider-right`,
    kids: [
      Skeletons.Button.Svg({
        ico: 'dock-nav',
        className: `${pfx}__button nav`,
        service: _e.launch,
        sys_pn: 'dock-nav-button',
        uiHandler: _ui_,
        tooltips: {
          className: `${_ui_.fig.family}__tooltips ${_ui_.fig.name}-tooltips`,
          content: LOCALE.NAV
        }
      })
    ]
  });
  
  const trash = Skeletons.Box.X({
    debug     : __filename,
    className   : `${_ui_.fig.family}__container trash-container ${_ui_.fig.family}--divider-left`,
    kids : [
      Skeletons.Button.Svg({
        ico       : 'dock-trash',
        className : `${pfx}__button trash`, 
        service   : _e.trash,
        sys_pn    : "trash-bin",
        uiHandler : _ui_,
        tooltips  : { 
          className : `${_ui_.fig.family}__tooltips ${_ui_.fig.name}-tooltips`,
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
      // require('./minifier').default(_ui_),
      // require('./mobile')(_ui_),
      require('./maker')(_ui_),
      require('./launcher')(_ui_),
      trash
    ]});



  return a;
};
module.exports = __desk_dock;
