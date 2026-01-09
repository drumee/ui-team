
const __invitation_direct = function (ui) {
  let close;
  if (ui.mget('closeButton')) {
    close = Preset.Button.Close(ui);
  }

  const a = [
    require("./recipients")(ui),
    require("./options-bar")(ui),
    Skeletons.Wrapper.Y({
      name: "settings",
      part: ui,
      className: `${ui.fig.family}__settings settings`
    }),
    ui.mget('action_bar') ?
      require("./actions-bar")(ui) : undefined
  ];
  if (close) {
    a.unshift(close);
  }
  return a;
};
module.exports = __invitation_direct;
