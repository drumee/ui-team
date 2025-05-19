const __skl_widget_chat_footer = function (ui) {

  const chatFig = ui.fig.family;
  const chatFooterContent = [];

  const message = Skeletons.Box.Y({
    className: `${chatFig}__messenger-wrapper`,
    kids: [
      Skeletons.Box.X({
        className: `${chatFig}-reply__wrapper`,
        sys_pn: 'reply-wrapper',
        dataset: {
          mode: _a.closed
        }
      }),


      Skeletons.Messenger({
        className: `${chatFig}__messenger`,
        sys_pn: _a.message,
        dataset: {
          mode: _a.open
        },
        uiHandler: [ui],
        autofocus: 1,
        autoclear: 1,
        mode: _e.commit,
        service: _e.send,
        content: ui.getStoredMessage(),
        bubble: 0
      }),

      Skeletons.Wrapper.Y({
        className: `${chatFig}__attachment-wrapper`,
        sys_pn: 'attachment-container',
        kids: {
          kind: 'media_wrapper',
          storageKey: ui.storageKey,
          uiHandler: [ui],
          partHandler:[ui],
          sys_pn: "attachment-list"
        }
      })
    ]
  });

  const messageOptions = Skeletons.Box.Y({
    className: `${chatFig}__message-options-wrapper`,
    sys_pn: 'message-options-wrapper',
    state: 0,
    kids: [
      Skeletons.Box.X({
        className: `${chatFig}__message-count`,
        sys_pn: 'selected-message-count'
      }),

      Skeletons.Box.X({
        className: `${chatFig}__action-buttons`,
        sys_pn: 'message-action-buttons'
      })
    ]
  });

  if (Visitor.isMimicUser() || ui.mget('isReadOnly')) {
    const readOnly = Skeletons.Wrapper.Y({
      className: `${chatFig}_read-only-msg`,
      kids: [
        Skeletons.Note({
          content: ui.mget('readOnlyMsg') || 'Read Only'
        })
      ]
    });
    chatFooterContent.push(readOnly);
  } else {
    chatFooterContent.push(message);
    chatFooterContent.push(messageOptions);
  }

  return chatFooterContent;
};

module.exports = __skl_widget_chat_footer;