const { workspaceContent } = require('../../skeleton/toolkit');

module.exports = function (ui) {
  const fig = ui.fig.family;
  return Skeletons.Box.Y({
    className: `${fig}__main`,
    kids: [workspaceContent(ui)],
  });
};
