
/**
 * 
 * @param {*} ui 
 * @returns 
 */
const __skl_widget_chat = function (ui) {

  let content;
  const chatFig = ui.fig.family;

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

  const list = Skeletons.List.Smart({
    sys_pn: _a.list,
    flow: _a.none,
    className: `${chatFig}__messages`,
    uiHandler: ui,
    start: _a.bottom,
    formItem: 'messages',
    dataType: _a.array,
    dataset: {
      role: _a.container,
      area: ui.mget(_a.area)
    },
    spinnerWait: 500,
    spinner: true,
    placeholder: Skeletons.Note(LOCALE.NO_DISCUSSIONS_YET, 'no-content'),
    itemsOpt: {
      kind: 'widget_chat_item',
      area: ui.mget(_a.area),
      type: ui.mget(_a.type),
      logicalParent: ui,
      uiHandler: ui
    },
    vendorOpt: Preset.List.Orange_e,
    api: ui.getCurrentApi
  });

  if (!ui.getCurrentApi()) {
    delete list.api;
  }
  content = Skeletons.Box.X({
    className: `${chatFig}__chat-content`,
    kids: [
      list,
      scrollButton
    ]
  });

  const body = Skeletons.Box.Y({
    className: `${chatFig}__body`,
    sys_pn: _a.content,
    kids: [
      fileDragDropWrapper,
      content
    ]
  });

  const ackWrapper = Skeletons.Wrapper.Y({
    className: `${chatFig}__ack-wrapper ack-wrapper`,
    name: 'ack'
  });
  const { firstname, lastname } = Visitor.profile()
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
            className: `${chatFig}__desk-picker`,
            name: 'desk-picker',
          }),
          Skeletons.Wrapper.Y({
            className: `${chatFig}_chat_footer ack-wrapper`,
            sys_pn: 'chat-footer',
            kids: require('./footer')(ui)
          }),
          Skeletons.Box.Y({
            className: `${chatFig}__avatar-cache`,
            sys_pn: 'avatar-cache',
            kids: [
              Skeletons.UserProfile({
                className: `${chatFig}__profile`,
                id: Visitor.id,
                firstname,
                lastname,
                fullname: Visitor.fullname(),
                online: 1,
                live_status: 1,
                auto_color: 1,
                sys_pn: "my-profile"
              }),
            ]
          })
        ]
      })
    ]
  });

  return a;
};

module.exports = __skl_widget_chat;