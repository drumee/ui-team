
/**
 * Empty state for a support conversation that has not started yet.
 *
 * A blank "No discussions yet" is the wrong first thing to show someone who
 * has just asked for help: it reads as an error, not an invitation. Returns
 * null for every other conversation, which keeps the default placeholder.
 *
 * @param {*} ui
 * @returns Skeleton|null
 */
function supportPlaceholder(ui) {
  const peer = ui.mget('peer');
  if (!peer || !peer.is_support) return null;
  const chatFig = ui.fig.family;
  return Skeletons.Box.Y({
    className: `${chatFig}__support-empty no-content`,
    kids: [
      Skeletons.Note({
        className: `${chatFig}__support-empty-title`,
        content: LOCALE.SUPPORT_EMPTY_TITLE
      }),
      Skeletons.Note({
        className: `${chatFig}__support-empty-text`,
        content: LOCALE.SUPPORT_EMPTY_TEXT
      })
    ]
  });
}

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
      // Stop the window marquee selector at the chat surface so browser text
      // selection can span lines and message bubbles for copy/paste.
      role: _a.root,
      area: ui.mget(_a.area)
    },
    spinnerWait: 500,
    spinner: true,
    placeholder: supportPlaceholder(ui) || Skeletons.Note(LOCALE.NO_DISCUSSIONS_YET, 'no-content'),
    itemsOpt: {
      // Item widget kind is configurable so a host (e.g. the DMZ share chat)
      // can swap in a variant — see chat-item-other, which pins every message
      // to the "other" side. Defaults to the standard me/other chat item.
      kind: ui.mget('item_kind') || 'widget_chat_item',
      area: ui.mget(_a.area),
      // Fall back to `area` when type is missing so chat-item template's
      // `m.type == _a.share` gate fires for folder/share-room messages
      // loaded via channel.messages (the api row has no type field).
      type: ui.mget(_a.type) || ui.mget(_a.area),
      logicalParent: ui,
      uiHandler: ui
    },
    vendorOpt: Preset.List.Orange_e,
    api: ui.getCurrentApi
  });

  if (!ui.getCurrentApi()) {
    delete list.api;
  }
  const scopeChip = Skeletons.Box.X({
    className: `${chatFig}__scope-chip-bar`,
    sys_pn: 'scope-chip',
    state: 0,
    kids: [
      Skeletons.Box.X({
        className: `${chatFig}__scope-chip-pill`,
        kids: [
          Skeletons.Note({
            sys_pn: 'scope-chip-label',
            className: `${chatFig}__scope-chip-label`,
            content: ''
          }),
          Skeletons.Button.Svg({
            ico: 'cross',
            className: `${chatFig}__scope-chip-clear`,
            service: 'clear-file-scope',
            tooltips: LOCALE.CANCEL || 'Cancel',
            uiHandler: [ui]
          })
        ]
      })
    ]
  });

  // Ephemeral typing indicator, styled as an incoming-message bubble (Figma
  // 2370-70205): the typer's avatar + a white bubble with three animated dots.
  // Pinned just above the input by living in the footer wrapper (which sits at
  // the panel bottom) and floating above it — see skin __typing-indicator — so
  // it always reads as the last (incoming) message at the bottom of the list.
  // The avatar slot is fed per-typer in chat._renderTypers. Hidden (state 0)
  // until someone is typing.
  const typingIndicator = Skeletons.Box.X({
    className: `${chatFig}__typing-indicator`,
    sys_pn: 'typing-indicator',
    state: 0,
    kids: [
      Skeletons.Box.Y({
        className: `${chatFig}__typing-avatar`,
        sys_pn: 'typing-avatar'
      }),
      Skeletons.Box.X({
        className: `${chatFig}__typing-bubble`,
        kids: [
          Skeletons.Box.X({
            className: `${chatFig}__typing-dots`,
            kids: [
              Skeletons.Note({ className: `${chatFig}__typing-dot` }),
              Skeletons.Note({ className: `${chatFig}__typing-dot` }),
              Skeletons.Note({ className: `${chatFig}__typing-dot` })
            ]
          })
        ]
      })
    ]
  });

  content = Skeletons.Box.Y({
    className: `${chatFig}__chat-content`,
    kids: [
      scopeChip,
      Skeletons.Box.X({
        className: `${chatFig}__chat-content-inner`,
        kids: [
          list,
          scrollButton
        ]
      })
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
            kids: [typingIndicator, ...require('./footer')(ui)]
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
