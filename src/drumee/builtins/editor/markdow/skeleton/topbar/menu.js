const __window_topbar_menu=function(_ui_){
  const pfx = `${_ui_.fig.family}-topbar`;
  const a = Skeletons.Box.X({
    className   : `${pfx}__menu`,
    kids : []
  });

  return a; 
};

module.exports = __window_topbar_menu;
