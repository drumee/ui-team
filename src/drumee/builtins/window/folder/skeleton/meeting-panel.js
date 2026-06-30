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
        sys_pn: "meeting-panel",
        partHandler: ui,
        kids: [
          {
            kind: "window_meeting",
            className: `${pfx}-room-widget`,
            hub_id: ui.mget(_a.hub_id),
            filename: ui.mget(_a.filename),
            nid: ui.mget(_a.actual_home_id) || ui.mget(_a.nid),
            room_id: ui.mget(_a.actual_home_id) || ui.mget(_a.nid),
            // Forward this folder's chat-channel identity so the joiner's meeting
            // chat binds to the SAME folder-scoped conversation as the host (who
            // launches via _launchMeetingStandalone). Without these the side panel
            // mounts UNSCOPED (meetingSidePanel's isTeamChannel = false): the
            // joiner's posts carry no _scope_nid, so the host's folder-scoped chat
            // filters them out in realtime. chat_nid is the folder chat's scope
            // nid (this window's own nid), not the workspace root.
            actual_hub_id: ui.mget(_a.actual_hub_id),
            actual_home_id: ui.mget(_a.actual_home_id),
            chat_nid: ui.mget(_a.nid),
            home_id: ui.mget(_a.home_id),
            ownpath: ui.mget(_a.ownpath),
            area: ui.mget(_a.area),
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
