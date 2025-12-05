const button = require('./button');

function menu_items(ui) {
  const pfx = `${ui.fig.family}__folder`;

  return Skeletons.Box.Y({
    debug: __filename,
    className: `${pfx}-items`,
    flow: _a.vertical,
    kids: [
      Skeletons.Box.G({
        className: `${pfx}-item public`,
        helperName: 'folder',
        service: "add-folder",
        area: _a.public,
        filename: LOCALE.MY_PUBLIC_FOLDER,
        kidsOpt: {
          active: 0
        },
        kids: [
          { kind: 'media_grid', className: `${pfx}-item-icon`, filetype: _a.hub, area: _a.public, mode: _a.vignette },
          Skeletons.Note({ className: `${pfx}-item-text`, content: LOCALE.CREATE_PUBLIC_FOLDER })
        ]
      }),
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
          { kind: 'media_grid', className: `${pfx}-item-icon`, filetype: _a.hub, area: _a.share, mode: _a.vignette },
          Skeletons.Note({ className: `${pfx}-item-text`, content: LOCALE.CREATE_SHARED_FOLDER })
        ]
      }),
      Skeletons.Box.G({
        className: `${pfx}-item private`,
        helperName: 'teamroom',
        service: 'add-team',
        // respawn: 'hub_team',
        area: _a.private,
        filename: LOCALE.MY_PRIVATE_FOLDER,
        kidsOpt: {
          active: 0
        },
        kids: [
          { kind: 'media_grid', className: `${pfx}-item-icon`, filetype: _a.hub, area: _a.private, mode: _a.vignette },
          Skeletons.Note({ className: `${pfx}-item-text`, content: LOCALE.CREATE_PRIVATE_FOLDER })
        ]
      }),
      Skeletons.Box.G({
        className: `${pfx}-item personal`,
        helperName: 'folder',
        service: "add-folder",
        filename: LOCALE.MY_PERSONAL_FOLDER,
        area: _a.personal,
        kidsOpt: {
          active: 0
        },
        kids: [
          { kind: 'media_grid', className: `${pfx}-item-icon`, filetype: _a.hub, area: _a.personal, mode: _a.vignette },
          Skeletons.Note({ className: `${pfx}-item-text`, content: LOCALE.CREATE_PERSONAL_FOLDER })
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
      button(ui, {
        ico: "dock-gallery",
        className: `${pfx} gallery`,
        // service: 'add-media',
        helperName: 'gallery'
      }, LOCALE.PHOTO_PLAYER),

      button(ui, {
        ico: "dock-music",
        className: `${pfx} sharebox`,
        // service: 'add-sharebox',
        // respawn: 'hub_sharebox',
        helperName: 'sharebox'
      }, LOCALE.MUSIC_PLAYER),

      button(ui, {
        ico: "dock-media",
        className: `${pfx} team`,
        // service: 'add-team',
        // respawn: 'hub_team',
        helperName: 'teamroom'
      }, LOCALE.VIDEO_PLAYER)

    ]
  });

  return a;
};

module.exports = __desk_dock_items_makers;
