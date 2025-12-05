const __skl_folder_topbar_logo = function (_ui_) {
  const a = Skeletons.Box.X({
    className: `${_ui_.fig.family}__logo`,
    kids: [
      Skeletons.Button.Svg({
        ico: "logo",
        className: `${_ui_.fig.family}__icon logo`,
        uiHandler: _ui_,
      }),
    ],
  });
  return a;
};

module.exports = __skl_folder_topbar_logo;
