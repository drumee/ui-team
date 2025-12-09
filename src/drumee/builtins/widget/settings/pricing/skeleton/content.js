const { folder_logo } = require("../../../../skeleton/toolkit/logo");
const { button } = require("../../../../skeleton/toolkit/buttons");

/**
 *
 * @param {*} ui
 * @param {*} opt
 */
function item(ui, icon, label, price, capacity, recommend) {
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
    kids: [require("./logo").default(ui, icon), titleWrapper],
  });

  const checkbox = Skeletons.Box.X({
    className: `${ui.fig.family}__checkbox checkbox`,
    uiHandler: ui,
  });

  return Skeletons.Box.X({
    className: `${ui.fig.family}__item`,
    sys_pn: "item",
    uiHandler: ui,
    radio: `color-radio-${ui._id}`,
    kids: [container, checkbox],
  });
}

function settings_content(ui) {
  const fig = `${ui.fig.family}`;
  const group = `${ui.fig.group}`;

  const itemWrapper = Skeletons.Box.Y({
    className: `${fig}__item-wrapper`,

    kids: [
      item(ui, "c1", "Drumee Free", "4.99", "5G"),
      item(ui, "c2", "Drumee Plus", "13.99", "20G", true),
      item(ui, "c3", "Drumee Premium", "39.99", "50G"),
      item(ui, "c4", "Enterprise", "79.99", "99G"),
    ],
  });

  const buttons = Skeletons.Box.X({
    className: `${group}__buttons`,
    uiHandler: ui,
    kids: [
      button(ui, {
        label: "Not Now",
        type: _a.toggle,
        className: `${group}__button`,
        service: _e.close,
        priority: "secondary",
      }),
      button(ui, {
        label: "Subscribe Now",
        type: _a.toggle,
        className: `${group}__button`,
        service: _e.close,
        priority: "primary",
      }),
    ],
  });

  return Skeletons.Box.Y({
    className: `${group}__content`,
    kidsOpt: { active: 0 },
    uiHandler: ui,
    kids: [itemWrapper, buttons],
  });
}

export default settings_content;
