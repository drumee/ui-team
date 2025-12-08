const { folder_logo } = require("../../../../skeleton/toolkit/logo");

function feature(ui, text) {
  const fig = `${ui.fig.family}`;

  return Skeletons.Box.X({
    className: `${fig}__feature`,
    kids: [
      Skeletons.Button.Svg({
        ico: "logo",
        className: `${fig}__feature icon`,
        uiHandler: ui,
      }),
      Skeletons.Note({
        className: `${fig}__feature title`,
        content: text,
      }),
    ],
  });
}

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

  const featureWrapper = Skeletons.Box.Y({
    className: `${fig}__header feature-wrapper`,
    kids: [
      feature(ui, "Just enough to test the ecosystem."),
      feature(ui, "Core identity, chat, and minimal file share."),
      feature(ui, "Encourages upgrade quickly."),
    ],
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
