const button = require("./button");
/**
 *
 * @param {*} ui
 * @returns
 */
function menu_items(ui) {
  const pfx = `${ui.fig.family}__folder`;

  const items = [
    {
      service: "add-document",
      ico: "desktop_docfile",
      label: LOCALE.DOCUMENT,
    },
    {
      service: "add-presentation",
      ico: "presentation",
      label: LOCALE.PRESENTATION,
    },
    {
      service: "add-spreadsheet",
      ico: "account_websites",
      label: LOCALE.SPREADSHEET,
    },
    {
      service: "add-note",
      ico: "dock-note",
      label: LOCALE.NOTE,
    },
  ];

  const renderItem = ({ service, ico, label }) =>
    Skeletons.Box.G({
      className: `${pfx}-item small`,
      service,
      kidsOpt: { active: 0 },
      kids: [
        Skeletons.Button.Svg({
          ico,
          className: `${pfx}-item-small-icon`,
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
function folderMenu(ui) {
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

const __desk_dock_note_modal = function (ui) {
  const pfx = `${ui.fig.family}__button maker`;

  const a = Skeletons.Box.X({
    debug: __filename,
    className: `${ui.fig.family}__container application maker ${ui.fig.family}--divider-left`,
    kids: [folderMenu(ui)],
  });

  return a;
};

module.exports = __desk_dock_note_modal;
