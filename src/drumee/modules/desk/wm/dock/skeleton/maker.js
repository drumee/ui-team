
const icons = {
  folder: require('assets/icon/folder.svg').default,
  gallery: require('assets/icon/gallery.svg').default,
  location: require('assets/icon/location.svg').default,
  note: require('assets/icon/note.svg').default,
};

const __desk_dock_items_makers = function (_ui_) {
  let profileType = 'pro';
  if (Visitor.isHubUser()) {
    profileType = _a.hub;
  }
  const button = require('./button');
  const pfx = `${_ui_.fig.family}__button maker ${profileType}`;

  const a = Skeletons.Box.X({
    debug: __filename,
    className: `${_ui_.fig.family}__container application maker ${profileType}`,
    kids: [
      button(_ui_, {
        ico: "raw-drumee-folder-blue",
        svgSource: icons.folder,
        className: `${pfx} folder big`,
        service: "add-folder",
        helperName: 'folder'
      }, LOCALE.FOLDER),

      button(_ui_, {
        ico: "raw-drumee-folder-orange",
        svgSource: icons.gallery,
        className: `${pfx} sharebox`,
        service: 'add-sharebox',
        respawn: 'hub_sharebox',
        helperName: 'sharebox'
      }, LOCALE.SHAREBOX),

      button(_ui_, {
        ico: "raw-drumee-folder-purple",
        svgSource: icons.location,
        className: `${pfx} team`,
        service: 'add-team',
        respawn: 'hub_team',
        helperName: 'teamroom'
      }, LOCALE.DOCK_TEAM_ROOM),

      button(_ui_, {
        ico: "ab-notes",
        svgSource: icons.note,
        className: `${pfx} note big`,
        service: "add-note",
        helperName: 'note'
      }, LOCALE.NOTE)
    ]
  });

  return a;
};

module.exports = __desk_dock_items_makers;
