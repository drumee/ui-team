const { gridFilesBrowser } = require("../toolkit")
module.exports = function (ui, header, size) {
  size = size || ui.size;
  if (size.height < 291) {
    size.height = 291;
  }


  // const body = Skeletons.Box.X({
  //   className: `${ui.fig.family}__body ${ui.fig.group}__body`,
  //   sys_pn: _a.content,
  //   attrOpt: {
  //     placeholder: LOCALE.DROP_SECTIONS_HERE,
  //   },
  //   type: _a.type,
  // });
  const body = Skeletons.Box.Y({
    className: `${ui.fig.family}__body ${ui.fig.group}__body`,
    sys_pn: _a.content,
    kids: gridFilesBrowser(ui),
    type: _a.type,
  });


  header.service = _e.raise;

  const dialog = Skeletons.Wrapper.Y({
    className: `${ui.fig.group}__wrapper--modal dialog__wrapper--modal ${ui.fig.family}`,
    name: "dialog",
  });

  const tooltips = Skeletons.Wrapper.Y({
    className: `${ui.fig.group}__wrapper-container`,
    name: "tooltips",
  });

  return Skeletons.Box.Y({
    className: `${ui.fig.family}__main ${ui.fig.group}__main drive-popup`,
    radio: _a.parent,
    debug: __filename,
    kids: [header, tooltips, body, dialog],
  });
};
