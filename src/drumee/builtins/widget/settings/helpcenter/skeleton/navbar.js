/**
 *
 * @param {*} ui
 * @param {*} opt
 */
function nav_item(ui, ico, label, page) {
  let fig = ui.fig.family;
  let state = 0;
  if (ui._page == page) state = 1;
  return Skeletons.Box.X({
    className: `${fig}__item`,
    uiHandler: [ui],
    radio: `nav-${ui._id}`,
    state,
    page,
    service: `load-page`,
    kidsOpt: { active: 0 },
    kids: [
      Skeletons.Button.Svg({
        ico,
        className: `${fig}__item-icon`,
        uiHandler: ui,
      }),
      Skeletons.Note({
        className: `${fig}__item-text`,
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
  let fig = ui.fig.family;
  const topics = Skeletons.Box.Y({
    className: `${fig}__topics`,
    kids: [
      Skeletons.Note({
        className: `${ui.fig.family}__title`,
        // content: LOCALE.SETTINGS,
        content: "Help & Support",
      }),
      nav_item(ui, "profile", "Welcome", 0),
      nav_item(ui, "settings", "User Guide", 1),
      nav_item(ui, "storage", "Documentations", 2),
      nav_item(ui, "shield", "Community", 3),
      nav_item(ui, "shield", "Terms of Service", 4),
      nav_item(ui, "shield", "Privacy Policy", 5),
    ],
  });

  return [topics];
}

export default nav;
