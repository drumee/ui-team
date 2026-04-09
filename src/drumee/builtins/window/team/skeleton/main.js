const { dialog, tooltips } = require("../../skeleton/toolkit")

function getChatLabel(ui) {
  const name = ui.mget(_a.filename) || ui.mget(_a.name) || '';
  return name ? `${name} - CHAT` : 'FOLDER-SCOPED CHAT';
}

function grid(ui) {
  const family = ui.fig.family;
  const group = ui.fig.group;
  const header = Skeletons.Box.X({
    debug: __filename,
    className: `${family}__header ${group}__header`,
    sys_pn: "window-header",
    kidsOpt: {
      radio: _a.on,
      uiHandler: ui,
    },
    service: _e.raise,
    kids: [
      require("./topbar")(ui, "desktop_sharebox_edit"),
    ],
  });

  const __files = Skeletons.Box.Y({
    className: `${ui.fig.group}__files-panel`,
    sys_pn: _a.content,
    type: _a.type,
  });

  const chatPanel = Skeletons.Box.Y({
    className: `${ui.fig.group}__chat-panel`,
    sys_pn: 'chat-panel',
    kids: [
      Skeletons.Note({
        className: `${ui.fig.group}__chat-label`,
        content: getChatLabel(ui),
      }),
      {
        kind: 'widget_chat',
        className: `${ui.fig.group}__chat-widget`,
        type: _a.share,
        view: 'quickChat',
        hub_id: ui.mget(_a.hub_id),
        placeholder: 'Type a message...',
        no_emoji: true,
        send_icon: 'send-chat',
        sys_pn: 'folder-chat',
      },
    ],
  });

  const splitBody = Skeletons.Box.G({
    className: `${ui.fig.family}__split-body ${ui.fig.group}__split-body`,
    kids: [__files, chatPanel],
  });

  return Skeletons.Box.Y({
    className: `${family}__main ${group}__main drive-popup`,
    radio: _a.parent,
    debug: __filename,
    kids: [header, tooltips, splitBody, dialog],
  });
};
module.exports = grid;
