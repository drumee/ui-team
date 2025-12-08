const { folder_logo } = require("../../../../skeleton/toolkit/logo");
const { button } = require("../../../../skeleton/toolkit/buttons");

/**
 *
 * @param {*} ui
 * @param {*} opt
 */
function item(ui, label, price, capacity, recommend) {
  let capacityBadge = "";
  let recommendBadge = "";
  if (capacity) {
    capacityBadge = Skeletons.Box.X({
      className: `${ui.fig.family}__badge-wrapper badge secondary`,
      uiHandler: ui,
      kids: [
        Skeletons.Note({
          className: `${ui.fig.family}__badge-wrapper text`,
          content: capacity,
        }),
      ],
    });
  }
  if (recommend) {
    recommendBadge = Skeletons.Box.X({
      className: `${ui.fig.family}__badge-wrapper badge primary`,
      uiHandler: ui,
      kids: [
        Skeletons.Note({
          className: `${ui.fig.family}__badge-wrapper text`,
          content: "Most Popular",
        }),
      ],
    });
  }
  const badgeWrapper = Skeletons.Box.X({
    className: `${ui.fig.family}__badge-wrapper`,
    uiHandler: ui,
    kids: [capacityBadge, recommendBadge],
  });

  const title = Skeletons.Box.X({
    className: `${ui.fig.family}__title`,
    uiHandler: ui,
    kids: [
      Skeletons.Note({
        className: `${ui.fig.family}__title text`,
        content: label,
      }),
      badgeWrapper,
    ],
  });

  const subtitle = Skeletons.Box.X({
    className: `${ui.fig.family}__subtitle`,
    uiHandler: ui,
    kids: [
      Skeletons.Note({
        className: `${ui.fig.family}__subtitle text`,
        content: `$${price} / month`,
      }),
    ],
  });

  const titleWrapper = Skeletons.Box.Y({
    className: `${ui.fig.family}__title-wrapper `,
    uiHandler: ui,
    kids: [title, subtitle],
  });

  const container = Skeletons.Box.X({
    className: `${ui.fig.family}__item-container `,
    uiHandler: ui,
    kids: [folder_logo(ui, { area: _a.personal }), titleWrapper],
  });

  const checkbox = Skeletons.Box.X({
    className: `${ui.fig.family}__checkbox`,
    uiHandler: ui,
  });

  return Skeletons.Box.X({
    className: `${ui.fig.family}__item`,
    uiHandler: ui,
    kids: [
      // Skeletons.Note({
      //   className: `${ui.fig.family}__item-label `,
      //   content: label,
      //   type: _a.toggle,
      // }),
      // widget,
      container,
      checkbox,
    ],
  });
}

/**
 *
 * @param {*} ui
 * @param {*} opt
 * @returns
 */
function settings_body(ui) {
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

  const header = Skeletons.Box.Y({
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

  const buttons = Skeletons.Box.X({
    className: `${fig}__buttons`,
    // kidsOpt: { active: 0 },
    uiHandler: ui,
    kids: [
      button(ui, {
        label: "Not Now",
        type: _a.toggle,
        className: `${fig}__button`,
        service: _e.close,
        priority: "secondary",
      }),
      button(ui, {
        label: "Subscribe Now",
        type: _a.toggle,
        className: `${fig}__button`,
        service: _e.close,
        priority: "primary",
      }),
    ],
  });

  const content = Skeletons.Box.Y({
    className: `${fig}__content`,
    kids: [
      item(ui, "Drumee Free", "4.99", "5G"),
      item(ui, "Drumee Plus", "13.99", "20G", true),
      item(ui, "Drumee Premium", "39.99", "50G"),
      item(ui, "Enterprise", "79.99", "99G"),
      buttons,
    ],
  });

  const header2 = require("./header");

  return Skeletons.Box.G({
    className: `${fig}__main`,
    debug: __filename,
    kids: [
      Skeletons.Box.Y({
        className: `${fig}__container`,
        // kids: [folder_logo(ui, { area: _a.personal })],
        kids: [header2],
      }),
      Skeletons.Box.Y({
        className: `${fig}__container`,
        kids: [content],
      }),
    ],
  });
}

export default settings_body;
