const { dialog, tooltips } = require("../../skeleton/toolkit")

function getChatLabel(ui) {
  const area = ui.mget(_a.area);
  switch (area) {
    case _a.share:
      return "CONVERSATION";
    case _a.dmz:
    case _a.restricted:
      return "TEAM CHAT";
    case _a.private:
      return `${ui.mget(_a.filename) || ui.mget(_a.name) || ''} - CHAT`;
    default:
      return "FOLDER-SCOPED CHAT";
  }
}

function grid (ui) {
  const header = Skeletons.Box.X({
    className: `${ui.fig.family}__header ${ui.fig.group}__header`,
    kidsOpt: {
      radio: _a.on,
      uiHandler: ui,
    },
    service: _e.raise,
    kids: [
      require("./topbar")(ui),
    ],
  });

  const __files = Skeletons.Box.Y({
    className: `${ui.fig.group}__files-panel`,
    sys_pn: _a.content,
    type: _a.type,
  });
  
  const chatLabel = Skeletons.Note({
    className: `${ui.fig.group}__chat-label`,
    content: getChatLabel(ui),
  });

  const chatPanel = Skeletons.Box.Y({
    className: `${ui.fig.group}__chat-panel`,
    sys_pn: 'chat-panel',
    kids: [
      chatLabel,
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
    className: `${ui.fig.family}__main ${ui.fig.group}__main drive-popup`,
    radio: _a.parent,
    debug: __filename,
    kids: [header, tooltips, splitBody, dialog],
  });
};
module.exports = grid;
