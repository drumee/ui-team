// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/widget/chat/skeleton/index.coffee
//   TYPE : Skelton
// ===================================================================**/

/**
 * 
 * @param {*} _ui_ 
 * @returns 
 */
const __skl_widget_chat = function (_ui_) {

  let content;
  const chatFig = _ui_.fig.family;

  const fileDragDropWrapper = Skeletons.Box.X({
    className: `${chatFig}__drag-drop-wrapper`,
    name: 'fileDragDrop',
    kids: [
      Skeletons.Note({
        className: `${chatFig}__drag-drop`,
        content: LOCALE.DRAG_AND_DROP
      })
    ]
  });

  const scrollButton = Skeletons.Box.X({
    className: `${chatFig}__button-scroll`,
    state: 0,
    sys_pn: "button-scroll",
    service: 'scroll-down',
    kidsOpt: {
      active: 0
    },
    kids: [
      Skeletons.Note({
        sys_pn: "new-message",
        className: `${chatFig}__button-scroll-note`,
        content: LOCALE.NEW_MESSAGES,
        dataset: {
          count: 0
        }
      }),
      Skeletons.Button.Svg({
        ico: 'editbox_arrow--down',
        className: `${chatFig}__button-scroll-icon`
      })
    ]
  });

  if (_ui_.type === _a.supportTicket) {
    const supportTicket =
      { kind: 'create_support_ticket' };

    content = Skeletons.Box.X({
      className: `${chatFig}__chat-content`,
      kids: [
        supportTicket
      ]
    });

  } else {
    const list = Skeletons.List.Smart({
      sys_pn: _a.list,
      flow: _a.none,
      className: `${chatFig}__messages`,
      uiHandler: _ui_,
      start: _a.bottom,
      formItem: 'messages',
      dataType: _a.array,
      dataset: {
        role: _a.container,
      },
      spinnerWait: 500,
      spinner: true,
      evArgs: Skeletons.Note(LOCALE.NO_DISCUSSIONS_YET, 'no-content'),
      itemsOpt: {
        kind: 'widget_chat_item',
        className: `widget_chat_item ${_ui_.type}`,
        type: _ui_.type,
        logicalParent: _ui_,
        uiHandler: _ui_
      },
      vendorOpt: Preset.List.Orange_e,
      api: _ui_.getCurrentApi
    });
    if (!_ui_.getCurrentApi()) {
      delete list.api;
    }
    content = Skeletons.Box.X({
      className: `${chatFig}__chat-content`,
      kids: [
        list,
        scrollButton
      ]
    });
  }
  const body = Skeletons.Box.Y({
    className: `${chatFig}__body drive-content u-ai-center`,
    sys_pn: _a.content,
    type: _a.type,
    kids: [
      fileDragDropWrapper,
      content
    ]
  });

  const ackWrapper = Skeletons.Wrapper.Y({
    className: `${chatFig}__ack-wrapper ack-wrapper`,
    name: 'ack'
  });

  const a = Skeletons.Box.Y({
    className: `${chatFig}__main`,
    debug: __filename,
    sys_pn: 'chat-content',
    state: 0,
    kids: [
      Skeletons.Box.Y({
        className: `${chatFig}__container`,
        kids: [
          body,
          ackWrapper,
          Skeletons.Wrapper.Y({
            className: `${chatFig}_chat_footer ack-wrapper`,
            sys_pn: 'chat-footer',
            kids: require('./footer')(_ui_)
          })
        ]
      })
    ]
  });

  return a;
};

module.exports = __skl_widget_chat;