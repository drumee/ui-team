const { badgePersonal } = require("builtins/media/grid/template/folder/badge-personal")

function folder_logo(ui, c) {
  return Skeletons.Box.X({
    className: `${ui.fig.family}__logo`,
    kids: [
      Skeletons.Element({
        content: badgePersonal({ area: _a.personal, widgetId: `${ui.mget(_a.widgetId)}-${c}` }),
        className: `${ui.fig.family}__icon logo ${c}`,
      }),
    ],
  });
};

function settings_header(ui) {
  const fig = `${ui.fig.family}`;

  const logoWrapper = Skeletons.Box.X({
    className: `${fig}__header logo-wrapper`,
    kids: [
      folder_logo(ui, 'c1'),
      folder_logo(ui, 'c2'),
      folder_logo(ui, 'c3'),
      folder_logo(ui, 'c4'),
      folder_logo(ui, 'c5'),
    ],
  });

  const feature = Skeletons.Box.X({
    className: `${fig}__feature`,
    kids: [
      Skeletons.Button.Svg({
        ico: "logo",
        className: `${fig}__feature icon`,
        uiHandler: ui,
      }),
      Skeletons.Note({
        className: `${fig}__feature title`,
        content: "Unlock Full Potential",
      }),
    ],
  });

  const featureWrapper = Skeletons.Box.Y({
    className: `${fig}__header feature-wrapper`,
    kids: [feature, feature, feature],
  });

  return Skeletons.Box.Y({
    className: `${fig}__header`,
    kids: [
      logoWrapper,
      Skeletons.Note({
        className: `${fig}__header title`,
        content: "Unlock Full Potential",
      }),
      featureWrapper,
    ],
  });
}

export default settings_header;
