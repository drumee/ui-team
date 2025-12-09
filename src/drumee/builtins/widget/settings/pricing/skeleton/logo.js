const {
  badgePersonal,
} = require("builtins/media/grid/template/folder/badge-personal");

function gradient_logo(ui, c) {
  return Skeletons.Box.X({
    className: `${ui.fig.family}__logo`,
    kids: [
      Skeletons.Element({
        content: badgePersonal({
          area: _a.personal,
          widgetId: `${ui.mget(_a.widgetId)}-${c}`,
        }),
        className: `${ui.fig.family}__icon logo ${c}`,
      }),
    ],
  });
}

export default gradient_logo;
