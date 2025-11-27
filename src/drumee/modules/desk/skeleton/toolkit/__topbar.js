const __desk_top_bar = function(_ui_) {
  const pfx = `${_ui_.fig.group}-topbar`;

  const a = Skeletons.Box.X({
    debug     : __filename,
    className : `${pfx}__main`,
    active    : 0,
    kids      : [
      Skeletons.Box.X({
        active      : 0,
        className: `${pfx}__center`,
        kids: require('./main-menu')(_ui_)
      })
    ]
  });
  return a;
};

module.exports = __desk_top_bar;
