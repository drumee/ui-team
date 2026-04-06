const cnWindowCreateMenu = "window-create-menu";
const cnWindowCreateDropdownMenu = `${cnWindowCreateMenu}__dropdown-menu`;

function item(ui, service, ico, content) {
  return Skeletons.Box.X({
    className: `${cnWindowCreateDropdownMenu}__item`,
    uiHandler: ui,
    service,
    kids: [
      Skeletons.Button.Svg({
        ico,
        className: `${cnWindowCreateDropdownMenu}__icon`,
      }),
      Skeletons.Note({
        content,
        className: `${cnWindowCreateDropdownMenu}__name`,
      }),
    ],
  });
}

module.exports = function (ui) {
  const trigger = Skeletons.Button.Svg({
    className: `${cnWindowCreateMenu}__dropdown-button`,
    ico: "editbox_list-plus",
    uiHandler: ui,
    partHandler: ui,
  });

  const menuItems = Skeletons.Box.Y({
    className: `${cnWindowCreateDropdownMenu}__items`,
    kids: [
      item(ui, "meeting", "dock-note", "Note"),
      item(ui, "webinar", "raw-documents_word", "Document"),
      item(ui, "channel", "raw-documents_excel", "Spreadsheet"),
      item(ui, "channel", "raw-documents_powerpoint", "Presentation"),
      item(ui, "channel", "dock-folder", "Folder"),
    ],
  });

  return {
    kind: KIND.menu.topic,
    sys_pn: "meeting-menu",

    className: `${cnWindowCreateDropdownMenu}__wrapper`,

    flow: _a.y,
    opening: _e.click,
    persistence: _a.none,

    trigger,
    items: menuItems,
  };
};
