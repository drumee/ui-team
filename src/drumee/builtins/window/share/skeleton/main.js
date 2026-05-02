/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : desk/window/share-box/skeleton/main
//   TYPE : Skelton
// ==================================================================== *
const { dialog, tooltips } = require('window/skeleton/toolkit');
const { gridFilesBrowser } = require('window/skeleton/toolkit');

const __skl_sharebox = function(_ui_) {
  const header = Skeletons.Box.X({
    debug     : __filename,
    className : `${_ui_.fig.family}__header ${_ui_.fig.group}__header`,
    kids : [require('./top-bar')(_ui_)]
  });

  const body = Skeletons.Box.Y({
    className: `${_ui_.fig.family}__body ${_ui_.fig.group}__body`,
    sys_pn: _a.content,
    kids: gridFilesBrowser(_ui_),
    type: _a.type,
  });

  const chatPanel = Skeletons.Box.Y({
    className: `${_ui_.fig.group}__chat-panel`,
    sys_pn: 'chat-panel',
    kids: [
      Skeletons.Note({
        className: `${_ui_.fig.group}__chat-label`,
        content: "TEAM CHAT",
      }),
      {
        kind: 'widget_chat',
        className: `${_ui_.fig.group}__chat-widget`,
        type: _a.share,
        view: 'quickChat',
        hub_id: _ui_.mget(_a.hub_id),
        placeholder: 'Type a message...',
        no_emoji: true,
        send_icon: 'raw-send-chat',
        attach_icon: 'chat-link-simple',
        sys_pn: 'folder-chat',
      },
    ],
  });

  const splitBody = Skeletons.Box.X({
    className: `${_ui_.fig.family}__split-body ${_ui_.fig.group}__split-body`,
    kids: [body, chatPanel],
  });

  const a = Skeletons.Box.Y({
    className: `${_ui_.fig.family}__main ${_ui_.fig.group}__main drive-popup`,
    radio: _a.parent,
    debug: __filename,
    kids: [header, tooltips, splitBody, dialog],
  });

  if (_ui_._shared != null) {
    a.kids.push(Skeletons.Box.X({
      className: `${_ui_.fig.family}__spinner`,
      kids: [Skeletons.Note({ className: _C.spinner })],
      wrapper: 1,
      sys_pn: _a.spinner,
    }));
  }

  return a;
};
module.exports = __skl_sharebox;
