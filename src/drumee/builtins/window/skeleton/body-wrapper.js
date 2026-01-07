module.exports = function (_ui_, content) {
  return Skeletons.Box.Y({
    debug: __filename,
    sys_pn: 'body-wrapper',
    className: `${_ui_.fig.group}__body-wrapper`,
    kids: content,
    style: { height: "100%", width: "100%" }
  });
};
