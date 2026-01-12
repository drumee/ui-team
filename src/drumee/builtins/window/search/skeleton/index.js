
module.exports = function(ui) {
  const header = Skeletons.Box.X({
    className : `${ui.fig.family}__header ${ui.fig.group}__header`, 
    debug     : __filename,
    kidsOpt : {
      radio     : _a.on,
      uiHandler : ui
    },
    kids : [require('./topbar')(ui)]
  });
  return require('window/skeleton/content/main')(ui, header);
}