const { gridFilesBrowser } = require("../../skeleton/toolkit");

module.exports = function meetingPanel(ui) {
  const pfx = `${ui.fig.family}__meeting`;

  return Skeletons.Box.X({
    className: `${pfx}-view`,
    debug: __filename,
    kids: [
      Skeletons.Box.Y({
        className: `${pfx}-files`,
        kids: [gridFilesBrowser(ui)],
      }),
      Skeletons.Box.Y({
        className: `${pfx}-room`,
        kids: [
          {
            kind: "window_meeting",
            className: `${pfx}-room-widget`,
            hub_id: ui.mget(_a.hub_id),
            filename: ui.mget(_a.filename),
            nid: ui.mget(_a.actual_home_id) || ui.mget(_a.nid),
            trigger: ui.mget(_a.media) || ui,
            media: ui.mget(_a.media) || ui,
            service: "meeting",
            uiHandler: [ui],
          },
        ],
      }),
    ],
  });
};
