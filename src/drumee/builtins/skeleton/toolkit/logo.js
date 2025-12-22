
export function folder_logo(ui, opt = {}) {
  const ico = `raw-badge-${opt.area || ui.mget(_a.area)}`
  return Skeletons.Box.X({
    className: `${ui.fig.family}__logo`,
    kids: [
      Skeletons.Button.Svg({
        ico,
        className: `${ui.fig.family}__icon logo`,
        uiHandler: ui,
      }),
    ],
  });
};
const { badgePersonal } = require("./templates/badge")
export function badge_logo(ui, c) {
  return Skeletons.Box.X({
    className: `${ui.fig.family}__logo`,
    kids: [
      Skeletons.Element({
        content: badgePersonal({ area: 'badge', widgetId: _.uniqueId('badge-') }),
        className: `${ui.fig.family}__icon badge ${c}`,
      }),
    ],
  });
};
