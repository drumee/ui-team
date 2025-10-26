
module.exports = function (_ui_) {
  const { protocol, main_domain } = bootstrap()
  return Skeletons.Button.Svg({
    ico: "available",//"account_check"
    src: `${protocol}://${main_domain}/-/static/images/icons/available.svg`,
    className: `${_ui_.fig.family}__correct`,
    uiHandler: [_ui_]
  });
};
