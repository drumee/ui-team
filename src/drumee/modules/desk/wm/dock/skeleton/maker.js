
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
        className: `${pfx} folder big`,
        service: "add-folder",
        helperName: 'folder'
      }, LOCALE.FOLDER),

      button(_ui_, {
        ico: "raw-drumee-folder-orange",
        className: `${pfx} sharebox`,
        service: 'add-sharebox',
        respawn: 'hub_sharebox',
        helperName: 'sharebox'
      }, LOCALE.SHAREBOX),

      button(_ui_, {
        ico: "raw-drumee-folder-purple",
        className: `${pfx} team`,
        service: 'add-team',
        respawn: 'hub_team',
        helperName: 'teamroom'
      }, LOCALE.DOCK_TEAM_ROOM),

      button(_ui_, {
        ico: "ab-notes",
        className: `${pfx} note big`,
        service: "add-note",
        helperName: 'note'
      }, LOCALE.NOTE)
    ]
  });

  return a;
};

module.exports = __desk_dock_items_makers;
