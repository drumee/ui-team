
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
        ico: "dock-folder",
        className: `${pfx} folder`,
        service: "add-folder",
        helperName: 'folder'
      }, 'Click to "Create Folder"'),

      button(_ui_, {
        ico: "dock-gallery",
        className: `${pfx} gallery`,
        service: 'add-media',
        helperName: 'gallery'
      }, 'Upload "Image"'),

      button(_ui_, {
        ico: "dock-music",
        className: `${pfx} sharebox`,
        service: 'add-sharebox',
        respawn: 'hub_sharebox',
        helperName: 'sharebox'
      }, 'Upload "Music"'),

      button(_ui_, {
        ico: "dock-media",
        className: `${pfx} team`,
        service: 'add-team',
        respawn: 'hub_team',
        helperName: 'teamroom'
      }, 'Upload "Video"')

    ]
  });

  return a;
};

module.exports = __desk_dock_items_makers;
