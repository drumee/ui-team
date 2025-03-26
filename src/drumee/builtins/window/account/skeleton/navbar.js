const _nav_items = function (_ui_) {
  const { toggleState } = require("core/utils")
  const r = _.uniqueId("nav-group-");

  const result = [];
  for (var n of _ui_.items) {
    var name = n;
    if (name === _e.data) {
      name = `my_${name}`;
    }
    result.push(Skeletons.Note({
      className: `${_ui_.fig.family}__navbar--item`,
      feature: "nav",
      radio: r,
      uiHandler: _ui_,
      content: LOCALE[name.toUpperCase()] || name,
      state: toggleState(_ui_.currentTab() === n),
      service: n
    }));
  }
  return result;
};

/**
 * 
 */
const __account_navbar = function (_ui_) {
  const a = Skeletons.Box.X({
    className: `${_ui_.fig.family}__navbar`,
    sys_pn: "navbar",
    kids: _nav_items(_ui_)
  });


  return a;
};

module.exports = __account_navbar;
