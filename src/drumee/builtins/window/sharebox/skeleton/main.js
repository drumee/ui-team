
const { dialog, tooltips } = require("../../skeleton/toolkit")

const __skl_window_sharebox = function (ui) {
  const menu = Skeletons.Box.X({
    debug: __filename,
    className: `${ui.fig.family}__header ${ui.fig.group}__header`,
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

  const body = Skeletons.Box.Y({
    className: `${ui.fig.family}__body ${ui.fig.group}__body`,
    sys_pn: _a.content,
    type: _a.type,
  });

  const chatLabel = Skeletons.Note({
    className: `${ui.fig.group}__chat-label`,
    content: "CONVERSATION",
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
        send_icon: 'raw-send-chat',
        sys_pn: 'folder-chat',
      },
    ],
  });

  const splitBody = Skeletons.Box.X({
    className: `${ui.fig.family}__split-body ${ui.fig.group}__split-body`,
    kids: [body, chatPanel],
  });

  return Skeletons.Box.Y({
    className: `${ui.fig.family}__main ${ui.fig.group}__main w-800px drive-popup`,
    radio: _a.parent,
    debug: __filename,
    kids: [menu, tooltips, splitBody, dialog],
  });
};
module.exports = __skl_window_sharebox;
