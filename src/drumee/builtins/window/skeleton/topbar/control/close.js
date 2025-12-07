
module.exports = function(ui) {
  return Skeletons.Button.Svg({
    ico        : _a.cross,
    className  : "icon ctrl-close",
    service    : _e.close,
    uiHandler  : ui
  });
};
