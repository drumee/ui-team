const __skl_window_channel = function(_ui_) {
  const channelFig = _ui_.fig.family;
  const topbar = require('window/skeleton/topbar/main')(_ui_);
  topbar.className = `${channelFig}__topbar`;
  const header = Skeletons.Box.X({
    className : `${channelFig}__header ${_ui_.fig.group}__header ${_ui_.mget(_a.area)}`, 
    kidsOpt: {
      radio : _a.on,
      uiHandler    : _ui_
    },
    kids : [require('./topbar')(_ui_)],
    service   : _e.raise
  });

  const content = Skeletons.Box.X({
    className : `${channelFig}__content`,
    sys_pn    : 'load_channel_content'
  });

  const a = Skeletons.Box.Y({
    className   : `${channelFig}__main`,
    debug       : __filename,
    kids        : [
      Skeletons.Box.Y({
        className   : `${channelFig}__container`,
        kids        : [
          header,
          content
        ]})
    ]});

  return a;
};

module.exports = __skl_window_channel;