const { tooltip, folder } = require('../../skeleton/toolkit');

const PARTICIPANTS = [
  { name: 'Lucas Zoe', muted: true, isMe: false },
  { name: 'Brenda Lucy', muted: true, isMe: false },
  { name: 'Earnest Hirthe', muted: true, isMe: false },
  { name: 'Maddy Ernest', muted: false, isMe: true },
];
const BADGE = {
  badge_text: 'STEP 4/5',
  title: 'Meeting in folder',
  desc: `Every folder has its own meeting space. Start a call directly from the folder you're working in, your files and conversations stay in the same place.`,
  direction: 'east',
};

function meetingHeader(ui, pfx) {
  return Skeletons.Box.X({
    className: `${pfx}__meeting-header`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__meeting-header-left`,
        kids: [
          Skeletons.Button.Svg({ ico: 'folder-meeting', className: `${pfx}__meeting-app-icon` }),
          Skeletons.Note({ className: `${pfx}__meeting-title`, content: 'Product Meeting' }),
        ],
      }),
      Skeletons.Box.X({
        className: `${pfx}__meeting-header-right`,
        kids: [
          Skeletons.Box.X({
            className: `${pfx}__meeting-recording`,
            kids: [
              Skeletons.Box.Y({ className: `${pfx}__rec-dot` }),
              Skeletons.Note({ className: `${pfx}__rec-time`, content: '01 : 24 : 56' }),
            ],
          }),
          Skeletons.Box.Y({ className: `${pfx}__meeting-avatar` }),
        ],
      }),
    ],
  });
}

function videoTile(ui, pfx, { name, muted, isMe }) {
  return Skeletons.Box.Y({
    className: `${pfx}__video-tile${isMe ? ' me' : ''}`,
    kids: [
      isMe ? Skeletons.Button.Svg({ ico: 'expand', className: `${pfx}__tile-expand` }) : null,
      isMe ? Skeletons.Note({ className: `${pfx}__tile-me-label`, content: 'ME' }) : null,
      Skeletons.Box.X({
        className: `${pfx}__tile-footer`,
        kids: [
          Skeletons.Box.X({
            className: `${pfx}__tile-footer-left`,
            kids: [
              Skeletons.Button.Svg({
                ico: muted ? 'mic-muted' : 'mic',
                className: `${pfx}__tile-mic${muted ? '' : ' active'}`,
              }),
              Skeletons.Note({ className: `${pfx}__tile-name`, content: name }),
            ],
          }),
          Skeletons.Button.Svg({ ico: 'more-vertical', className: `${pfx}__tile-more` }),
        ],
      }),
    ],
  });
}

function videoGrid(ui, pfx) {
  const rows = [PARTICIPANTS.slice(0, 2), PARTICIPANTS.slice(2, 4)];
  return Skeletons.Box.Y({
    className: `${pfx}__video-grid`,
    kids: rows.map((row) =>
      Skeletons.Box.X({
        className: `${pfx}__video-row`,
        kids: row.map((p) => videoTile(ui, pfx, p)),
      })
    ),
  });
}

function meetingToolbar(ui, pfx) {
  return Skeletons.Box.X({
    className: `${pfx}__meeting-toolbar`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__toolbar-actions`,
        kids: [
          Skeletons.Button.Svg({ ico: 'mic', className: `${pfx}__toolbar-btn active` }),
          Skeletons.Button.Svg({ ico: 'desktop-video', className: `${pfx}__toolbar-btn` }),
          Skeletons.Button.Svg({ ico: 'hand', className: `${pfx}__toolbar-btn` }),
          Skeletons.Button.Svg({ ico: 'apps-chat', className: `${pfx}__toolbar-btn` }),
          Skeletons.Button.Svg({ ico: 'more-vertical', className: `${pfx}__toolbar-btn` }),
        ],
      }),
      Skeletons.Button.Label({
        ico: 'log-out',
        className: `${pfx}__leave-btn`,
        label: LOCALE.LEAVE_MEETING || 'Leave Meeting',
      }),
    ],

  });
}

function meetingPanel(ui, pfx) {
  return Skeletons.Box.Y({
    className: `${pfx}__meeting-panel`,
    sys_pn: 'meeting-panel',
    kids: [
      meetingHeader(ui, pfx),
      tooltip(ui, BADGE),
      videoGrid(ui, pfx),
      meetingToolbar(ui, pfx),
    ],
  });
}

module.exports = function (ui) {
  return folder(ui, meetingPanel);
};
