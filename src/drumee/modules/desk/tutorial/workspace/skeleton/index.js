
const { workspaceContent } = require("../../skeleton/toolkit")
module.exports = function (ui) {
  const fig = ui.fig.family;
  return Skeletons.Box.Y({
    className: `${fig}__main`,
    kids: [
      workspaceContent(ui),
      Skeletons.Wrapper.Y({
        className: `${fig}__overlay`,
        sys_pn: 'overlay',
        partHandler: ui,
      }),
    ],
  });
};
