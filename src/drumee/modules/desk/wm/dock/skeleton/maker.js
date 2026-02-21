const button = require('./button');

/**
 * 
 */
function _folder_icon(ui, area) {
  const pfx = `${ui.fig.family}__folder`;
  return {
    kind: 'media_grid',
    className: `${pfx}-item-icon`,
    filetype: _a.hub,
    role: "desk",
    area,
    mode: _a.vignette
  }
}

/**
 * 
 * @param {*} ui 
 * @returns 
 */
function menu_items(ui) {
  const pfx = `${ui.fig.family}__folder`;
  let website = '';
  if (Visitor.profile().isDevel) {
    website = Skeletons.Box.G({
      className: `${pfx}-item public`,
      helperName: 'folder',
      service: "add-folder",
      area: _a.public,
      filename: LOCALE.MY_PUBLIC_FOLDER,
      kidsOpt: {
        active: 0
      },
      kids: [
        _folder_icon(ui, _a.public),
        Skeletons.Note({ className: `${pfx}-item-text`, content: LOCALE.CREATE_PUBLIC_FOLDER })
      ]
    })
  }
  return Skeletons.Box.Y({
    debug: __filename,
    className: `${pfx}-items`,
    flow: _a.vertical,
    kids: [
      website,
      Skeletons.Box.G({
        className: `${pfx}-item share`,
        service: 'add-sharebox',
        // respawn: 'hub_sharebox',
        filename: LOCALE.MY_EXTERNAL_FOLDER,
        area: _a.share,
        kidsOpt: {
          active: 0
        },
        kids: [
          _folder_icon(ui, _a.share),
          Skeletons.Note({ className: `${pfx}-item-text`, content: LOCALE.CREATE_SHARED_FOLDER })
        ]
      }),
      Skeletons.Box.G({
        className: `${pfx}-item private`,
        helperName: 'teamroom',
        service: 'add-team',
        // respawn: 'hub_team',
        area: _a.private,
        filename: "My team folder",
        kidsOpt: {
          active: 0
        },
        kids: [
          _folder_icon(ui, _a.private),
          Skeletons.Note({ className: `${pfx}-item-text`, content: "Create a team folder" })
        ]
      }),
      Skeletons.Box.G({
        className: `${pfx}-item personal`,
        helperName: 'folder',
        service: "add-folder",
        filename: "Folder",
        area: _a.personal,
        kidsOpt: {
          active: 0
        },
        kids: [
          _folder_icon(ui, _a.personal),
          Skeletons.Note({ className: `${pfx}-item-text`, content: "Create a folder" })
        ]
      }),
    ]
  });
};
function folderMenu(ui) {
  const pfx = `${ui.fig.family}__button`;
  const trigger = Skeletons.Box.X({
    className: `${pfx}-trigger`,
    kids: [
      button(ui, {
        ico: "dock-folder",
        className: `${pfx} menu`,
        helperName: 'folder'
      }, LOCALE.FOLDERS),
    ]
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
        offsetY: 20
      }
    ]
  });

};

const __desk_dock_items_makers = function (ui) {
  const pfx = `${ui.fig.family}__button maker`;

  const a = Skeletons.Box.X({
    debug: __filename,
    className: `${ui.fig.family}__container application maker`,
    kids: [
      folderMenu(ui),
    ]
  });

  return a;
};

module.exports = __desk_dock_items_makers;
