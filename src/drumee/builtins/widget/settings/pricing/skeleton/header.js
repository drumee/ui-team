const {
  badgePersonal,
} = require("builtins/media/grid/template/folder/badge-personal");

function folder_logo(ui, c) {
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
      require("./logo").default(ui, "c1"),
      require("./logo").default(ui, "c2"),
      require("./logo").default(ui, "c3"),
      require("./logo").default(ui, "c4"),
      require("./logo").default(ui, "c5"),
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
