const button = require("./button");
const { isDevDeployment } = require("builtins/window/skeleton/toolkit/new-menu-rows");
/**
 *
 * @param {*} ui
 * @returns
 */
function menu_items(ui) {
  const pfx = `${ui.fig.family}__folder`;

  const items = [
    {
      service: "add-folder",
      ico: "dock-folder",
      label: LOCALE.FOLDER,
      area: _a.personal,
      filename: LOCALE.NEW_FOLDER,
    },
    // Note: dev platforms only, as in the desk "+ New" menu.
    isDevDeployment()
      ? {
          service: "add-note",
          ico: "raw-note",
          label: LOCALE.NOTE,
        }
      : null,
    {
      name: "document.docx",
      ico: "raw-documents_word",
      label: LOCALE.DOCUMENT,
    },
    {
      name: "spreadsheet.xlsx",
      ico: "raw-documents_excel",
      label: LOCALE.SPREADSHEET,
    },
    {
      name: "presentation.pptx",
      ico: "raw-documents_powerpoint",
      label: LOCALE.PRESENTATION,
    },
  ].filter(Boolean);

  const renderItem = ({ name, ico, label, service, area, filename }) =>
    Skeletons.Box.G({
      className: `${pfx}-item`,
      service: service || "new-document",
      name,
      area,
      filename,
      kidsOpt: { active: 0 },
      kids: [
        Skeletons.Button.Svg({
          ico,
          className: `${pfx}-item-icon`,
        }),
        Skeletons.Note({
          className: `${pfx}-item-text`,
          content: label,
        }),
      ],
    });

  return Skeletons.Box.Y({
    debug: __filename,
    className: `${pfx}-items`,
    flow: _a.vertical,
    kids: items.map(renderItem),
  });
}

/**
 * 
 * @param {*} ui 
 * @returns 
 */
function menuWidget(ui) {
  const pfx = `${ui.fig.family}__button`;
  const trigger = Skeletons.Box.X({
    className: `${pfx}-trigger`,
    kids: [
      button(
        ui,
        {
          ico: "dock-note",
          className: `${pfx} menu`,
          helperName: "folder",
        },
        LOCALE.NOTE,
      ),
    ],
  });

  return Skeletons.Box.X({
    className: `${pfx}-container`,
    debug: __filename,
    kids: [
      {
        kind: KIND.menu.topic,
        className: `${pfx}-content`,
        flow: _a.y,
        opening: _e.click,
        service: "user-menu",
        sys_pn: "user-dropdown",
        persistence: _a.once,
        direction: _a.up,
        trigger,
        items: menu_items(ui),
        offsetY: 20,
      },
    ],
  });
}

module.exports = function (ui) {
  return Skeletons.Box.X({
    debug: __filename,
    className: `${ui.fig.family}__container application maker ${ui.fig.family}--divider-left`,
    kids: [menuWidget(ui)],
  });
};

