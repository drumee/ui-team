
const __skl_window_meeting = function (_ui_, content) {
  if (!_.isArray(content)) content = [content];
  const a = Skeletons.Box.Y({
    debug: __filename,
    sys_pn: 'body-wrapper',
    className: `${_ui_.fig.group}__body-wrapper`,
    kids: content,
    style: { height: "100%", width: "100%" }
  });

  return a;
};

module.exports = __skl_window_meeting;