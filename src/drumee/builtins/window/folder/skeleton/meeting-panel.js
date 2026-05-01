const { gridFilesBrowser } = require("../../skeleton/toolkit");

/**
 * Folder meeting tab. Initially mounts `widget_meeting` (the pre-call lobby
 * showing folder members). When the user clicks "Start Meeting", the folder
 * window swaps the room slot to `window_meeting` via _launchMeetingInPanel.
 */
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
        sys_pn: "meeting-panel",
        partHandler: ui,
        kids: [
          {
            kind: "widget_meeting",
            className: `${pfx}-room-widget`,
            hub_id: ui.mget(_a.hub_id),
            filename: ui.mget(_a.filename),
            nid: ui.mget(_a.actual_home_id) || ui.mget(_a.nid),
            uiHandler: [ui],
          },
        ],
      }),
    ],
  });
};
