const { folder_logo } = require("../../../../skeleton/toolkit/logo");

function settings_header(ui) {
  const fig = `${ui.fig.family}`;

  const logoWrapper = Skeletons.Box.X({
    className: `${fig}__header logo-wrapper`,
    kids: [
      folder_logo(ui, { area: _a.personal }),
      folder_logo(ui, { area: _a.personal }),
      folder_logo(ui, { area: _a.personal }),
      folder_logo(ui, { area: _a.personal }),
      folder_logo(ui, { area: _a.personal }),
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
