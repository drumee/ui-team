const button = require('./button');

function menu_items(ui) {
  const pfx = `${ui.fig.family}__folder`;
  console.log("AAA:5", Skeletons.Button.Label({
    chartName: "raw-folder-green",
    type: "raw",
    className: `${pfx} folder big`,
    service: "add-folder",
    helperName: 'folder',
    label: LOCALE.CREATE_PERSONAL_FOLDER,
  }))
  return Skeletons.Box.Y({
    debug: __filename,
    className: `${pfx}__items`,
    flow: _a.vertical,
    kids: [
      Skeletons.Button.Label({
        chartName: "folder",
        type: "raw",
        className: `${pfx} folder big`,
        service: "add-folder",
        helperName: 'folder',
        label: LOCALE.CREATE_PERSONAL_FOLDER,
      }),
      Skeletons.Button.Label({
        chartName: "folder",
        type: "raw",
        className: `${pfx} team`,
        service: 'add-team',
        respawn: 'hub_team',
        helperName: 'teamroom',
        label: LOCALE.CREATE_PRIVATE_FOLDER,
      }),
      Skeletons.Button.Label({
        chartName: "folder",
        type: "raw",
        className: `${pfx} sharebox`,
        service: 'add-sharebox',
        respawn: 'hub_sharebox',
        helperName: 'sharebox',
        label: LOCALE.CREATE_SHARED_FOLDER,
      }),
      Skeletons.Button.Label({
        chartName: "folder",
        type: "raw",
        className: `${pfx} folder big`,
        service: "add-folder",
        helperName: 'folder',
        label: LOCALE.CREATE_PUBLIC_FOLDER,
      }),
    ]
  });
};
function foldersMebu(ui) {
  const pfx = `${ui.fig.family}__button`;
  const trigger = Skeletons.Box.X({
    className: `${pfx}-trigger`,
    kids: [
      button(ui, {
        ico: "dock-folder",
        className: `${pfx} menu`,
        helperName: 'folder'
      }, LOCALE.CREATE_FOLDER),
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
      foldersMebu(ui),
      button(ui, {
        ico: "dock-gallery",
        className: `${pfx} gallery`,
        service: 'add-media',
        helperName: 'gallery'
      }, LOCALE.UPLOAD_IMAGE),

      button(ui, {
        ico: "dock-music",
        className: `${pfx} sharebox`,
        service: 'add-sharebox',
        respawn: 'hub_sharebox',
        helperName: 'sharebox'
      }, LOCALE.UPLOAD_MUSIC),

      button(ui, {
        ico: "dock-media",
        className: `${pfx} team`,
        service: 'add-team',
        respawn: 'hub_team',
        helperName: 'teamroom'
      }, LOCALE.UPLOAD_VIDEO)

    ]
  });

  return a;
};

module.exports = __desk_dock_items_makers;
