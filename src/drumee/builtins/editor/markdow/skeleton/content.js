

module.exports = function (ui, value = '') {
  let opt = {
    sys_pn: "editor",
    service: "text-input",
    className: `${ui.fig.family}__editor column`,
    type: _a.textarea,
    value,
    name: _a.content,
    formItem: _a.content,
    interactive: 1,
    escapeContextmenu: true,
    placeholder: LOCALE.ENTER_TEXT,
    attribute: {
      id: ui.editorId,
    },
  };
  if (!ui.canUpload()) opt.readonly = true;
  return Skeletons.Box.G({
    className: `${ui.fig.family}__editor--outer`,
    kids: [
      Skeletons.Entry(opt),
    ]
  });
}
