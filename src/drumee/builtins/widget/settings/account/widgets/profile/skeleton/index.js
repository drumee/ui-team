const { button } = require("../../../../skeleton/toolkit/buttons");

/**
 *
 * @param {*} ui
 * @param {*} opt
 */
function nav_item(ui, ico, label) {
  let state = 0;
  if (ui._page == index) state = 1;
  return Skeletons.Box.X({
    className: `${ui.fig.family}__badge-wrapper badge secondary`,
    uiHandler: { ui },
    kidsOpt: { active: 0 },
    radio: `nav-${ui._id}`,
    state,
    kids: [
      Skeletons.Button.Svg({
        ico,
        className: `${fig}__feature icon`,
        uiHandler: ui,
      }),
      Skeletons.Note({
        className: `${ui.fig.family}__badge-wrapper text`,
        content: label,
      }),
    ],
  });
}

/**
 * 
 * @param {*} ui 
 */
function nav(ui) {

  const topics = Skeletons.Box.Y({
    className: `${fig}__topics`,
    kids: [
      nav_item(ui, 'profile', LOCALE.PROFILE, 0),
      nav_item(ui, 'settings', LOCALE.PREFERENCES, 1),
      nav_item(ui, 'storage', LOCALE.STORAGE, 2),
      nav_item(ui, 'shield', LOCALE.SECURITY, 3),
    ],
  });
  const legals = Skeletons.Box.Y({
    className: `${fig}__legals`,
    kids: [
      Skeletons.Note({
        className: `${ui.fig.family}__legals text`,
        content: LOCALE.PRIVACY_POLICY,
      }),
      Skeletons.Note({
        className: `${ui.fig.family}__legals text`,
        content: LOCALE.TERMS_OF_SERVICE,
      }),
    ],
  });
  return [topics, legals]
}

/**
 *
 * @param {*} ui
 * @param {*} opt
 * @returns
 */
function settings_body(ui) {
  const fig = `${ui.fig.family}`;

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

  const widget = Skeletons.Box.X({
    className: `${fig}__buttons`,
    uiHandler: ui,
    sys_pn: _a.content,
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
      header,
      widget
    ],
  });

  const header2 = require("./header").default(ui);

  return Skeletons.Box.G({
    className: `${fig}__main`,
    debug: __filename,
    kids: [
      Skeletons.Box.Y({
        className: `${fig}__nav`,
        kids: [nav(ui)],
      }),
      Skeletons.Box.Y({
        className: `${fig}__container`,
        kids: [content],
      }),
    ],
  });
}

export default settings_body;
