const __skl_window_channel = function(_ui_) {
  const media = _ui_.mget(_a.media);

  const a = Skeletons.Button.Svg({
    className  : `${_ui_.fig.group}-channel__topbar--icon`,
    ico        : "tchat"
  });
  
  return a;
};

module.exports = __skl_window_channel;
