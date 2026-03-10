const button = require("./button");

/**
 *
 */
function _folder_icon(ui, area) {
  const pfx = `${ui.fig.family}__folder`;
  return {
    kind: "media_grid",
    className: `${pfx}-item-icon`,
    filetype: _a.hub,
    role: "desk",
    area,
    mode: _a.vignette,
  };
}

/**
 *
 * @param {*} ui
 * @returns
 */
function menu_items(ui) {
  const pfx = `${ui.fig.family}__folder`;

  return Skeletons.Box.Y({
    debug: __filename,
    className: `${pfx}-items`,
    flow: _a.vertical,
    kids: [
      Skeletons.Box.G({
        className: `${pfx}-item `,
        // service: 'add-sharebox',
        // filename: LOCALE.DOCUMENT,
        // area: _a.share,
        kidsOpt: {
          active: 0,
        },
        kids: [
          // _folder_icon(ui, _a.share),
          Skeletons.Button.Svg({
            ico: "storage",
            className: `${pfx}-item-icon`,
          }),
          Skeletons.Note({
            className: `${pfx}-item-text`,
            content: LOCALE.DOCUMENT,
          }),
        ],
      }),
      Skeletons.Box.G({
        className: `${pfx}-item `,
        // service: 'add-team',
        // helperName: 'teamroom',
        // area: _a.private,
        // filename: LOCALE.PRESENTATION,
        kidsOpt: {
          active: 0,
        },
        kids: [
          // _folder_icon(ui, _a.private),
          Skeletons.Button.Svg({
            ico: "storage",
            className: `${pfx}-item-icon`,
          }),
          Skeletons.Note({
            className: `${pfx}-item-text`,
            content: LOCALE.PRESENTATION,
          }),
        ],
      }),
      Skeletons.Box.G({
        className: `${pfx}-item `,
        // service: "add-folder",
        // helperName: 'folder',
        // filename: LOCALE.SPREADSHEET,
        // area: _a.personal,
        kidsOpt: {
          active: 0,
        },
        kids: [
          // _folder_icon(ui, _a.personal),
          Skeletons.Button.Svg({
            ico: "storage",
            className: `${pfx}-item-icon`,
          }),
          Skeletons.Note({
            className: `${pfx}-item-text`,
            content: LOCALE.SPREADSHEET,
          }),
        ],
      }),
      Skeletons.Box.G({
        className: `${pfx}-item `,
        service: "add-note",
        // filename: LOCALE.NOTE,
        // area: _a.personal,
        // helperName: 'folder',
        kidsOpt: {
          active: 0,
        },
        kids: [
          // _folder_icon(ui, _a.personal),
          Skeletons.Button.Svg({
            ico: "storage",
            className: `${pfx}-item-icon`,
          }),
          Skeletons.Note({
            className: `${pfx}-item-text`,
            content: LOCALE.NOTE,
          }),
        ],
      }),
    ],
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
