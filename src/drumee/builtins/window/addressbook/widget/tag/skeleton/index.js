// =============================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/window/addressbook/widget/tag/skeleton/index
//   TYPE : Skeleton
// =============================================================== *
const __skl_addressbook_widget_tag = function (_ui_) {
  let allConversations;
  const tagsFig = _ui_.fig.family;

  const mode = _ui_.mget(_a.viewMode);
  const type = _ui_.mget(_a.type);
  const tag_id = _ui_.mget(_a.radioId) || ('tag_selected' + _ui_.mget(_a.widgetId));

  const tagHeader = Skeletons.Box.X({
    className: `${tagsFig}__header`,
    kids: [
      Skeletons.Note({
        className: `${tagsFig}__note title`,
        content: LOCALE.TAG
      }),

      type === _a.contact ?
        Skeletons.Button.Svg({
          ico: 'desktop_plus',
          className: `${tagsFig}__icon add-tag desktop_plus`,
          service: _a.addTag,
          uiHandler: _ui_
        }) : undefined
    ]
  });

  const separator = Skeletons.Box.X({
    className: `${tagsFig}__separator`
  });

  const contentFig = `${tagsFig}-content`;
  const tagList = Skeletons.List.Smart({
    className: `${contentFig}__item list`,
    uiHandler: [_ui_],
    service: 'tag-list-data',
    flag: _a.all,
    option: _a.active,
    timer: 50,
    sys_pn: _a.tags,
    origin: _a.tag,
    api: _ui_.getCurrentApi,
    itemsOpt: {
      kind: 'tag_item',
      uiHandler: [_ui_],
      viewMode: mode,
      radio: tag_id,
      option: _a.active,
      chat: _ui_.mget(_a.chat)
    }
  });


  if (_ui_.mget(_a.chat)) {
    const allConversationsLabel = LOCALE.ALL_EXCHANGES;//'All conversations'

    allConversations = Skeletons.Box.Y({
      className: `${contentFig}__main`,
      kids: [
        Skeletons.Box.X({
          className: `${contentFig}__container ${type} ${mode}-view all-Conversations addressbook-widget-tag-item__ui`,
          service: 'show-all-conversations-list',
          option: _a.active,
          sys_pn: 'all-conversations',
          origin: 'all-conversations',
          flag: _a.all,
          type: _a.active,
          name: allConversationsLabel,
          uiHandler: [_ui_],
          radio: tag_id,
          dataset: {
            state: 1,
            radio: _a.on
          },
          kidsOpt: {
            active: 0
          },
          kids: [
            Skeletons.Note({
              className: `${contentFig}__digit`,
              innerClass: `${contentFig}__btn-counter contact_counter`,
              sys_pn: "all_conversations_counter",
              content: 0,
              dataset: {
                state: _a.closed
              }
            }),
            Skeletons.Note({
              className: `${contentFig}__note name`,
              content: allConversationsLabel
            })
          ]
        })
      ]
    });
  }


  let allContactLabel = LOCALE.ALL_CONTACTS;
  let counter = Skeletons.Note({});
  if (_ui_.mget(_a.chat)) {
    allContactLabel = LOCALE.INDIVIDUAL_CONVERSATIONS;
    //'Individual conversations'
    counter = Skeletons.Note({
      className: `${contentFig}__digit`,
      innerClass: `${contentFig}__btn-counter contact_counter`,
      sys_pn: "contact_counter",
      content: 0,
      dataset: {
        state: _a.closed
      }
    })
  }

  const allContacts = Skeletons.Box.Y({
    className: `${contentFig}__main`,
    debug: __filename,
    kids: [
      Skeletons.Box.X({
        className: `${contentFig}__container ${type} ${mode}-view all-contacts addressbook-widget-tag-item__ui`,
        service: 'show-contact-list',
        option: _a.active,
        sys_pn: _a.allContacts,
        origin: _a.allContacts,
        flag: _a.contact,
        type: _a.active,
        name: allContactLabel,
        uiHandler: [_ui_],
        radio: tag_id,
        dataset: {
          state: 1,
          radio: _a.on
        },
        kidsOpt: {
          active: 0,
          bloblo:1
        },
        kids: [
          counter,
          Skeletons.Note({
            className: `${contentFig}__note name`,
            content: allContactLabel
          })
        ]
      })
    ]
  });

  const allShareRoom = Skeletons.Box.X({
    className: `${tagsFig}__shareroom-wrapper ${type} share-room-list`,
    sys_pn: 'shareroom-wrapper',
    origin: _a.share,
    service: 'show-shareroom-list',
    flag: _a.share,
    option: _a.active,
    name: LOCALE.TEAM_ROOM_CHAT,
    radio: tag_id,
    kidsOpt: {
      active: 0
    },
    kids: [
      // Skeletons.Box.X
      //   className : "#{tagsFig}__sharechat_notify"
      //   sys_pn    : 'shareChatNotify'
      //   state     :  0
      //   kids      : [
      //     Skeletons.Button.Svg
      //       ico       : "#editbox_shapes-circle"# 'chat_notification'
      //       className : "#{tagsFig}__chat_note #{_ui_.fig.group}__chat_note chat_note"
      //       service   : 'chat_note'
      //       uiHandler : _ui_
      //   ]
      Skeletons.Note({
        className: `${contentFig}__digit`,
        innerClass: `${contentFig}__btn-counter team_counter`,
        sys_pn: "team_counter",
        content: 0,
        dataset: {
          state: _a.closed
        }
      }),
      Skeletons.Note({
        content: LOCALE.TEAM_ROOM_CHAT
      })
    ]
  });

  const archivedList = Skeletons.Box.Y({
    className: `${contentFig}__main`,
    debug: __filename,
    kids: [
      Skeletons.Box.X({
        className: `${contentFig}__container ${type} ${mode}-view archived-list addressbook-widget-tag-item__ui`,
        service: 'show-contact-list',
        sys_pn: _a.archived,
        origin: _a.archived,
        flag: _a.all,
        option: _a.archived,
        name: LOCALE.ARCHIVES,
        uiHandler: [_ui_],
        radio: tag_id,
        dataset: {
          state: 1,
          radio: _a.on
        },
        kidsOpt: {
          active: 0
        },
        kids: [
          Skeletons.Note({
            className: `${contentFig}__note name`,
            content: LOCALE.ARCHIVES
          })
        ]
      })
    ]
  });

  const pendingList = Skeletons.Box.Y({
    className: `${contentFig}__main`,
    debug: __filename,
    kids: [
      Skeletons.Box.X({
        className: `${contentFig}__container ${type} ${mode}-view pending-list addressbook-widget-tag-item__ui`,
        service: 'show-contact-list',
        sys_pn: _a.pending,
        origin: _a.pending,
        flag: _a.all,
        option: _a.sent,
        name: LOCALE.PENDING_INVITATION,
        uiHandler: [_ui_],
        radio: tag_id,
        dataset: {
          state: 1,
          radio: _a.on
        },
        kidsOpt: {
          active: 0
        },
        kids: [
          Skeletons.Note({
            className: `${contentFig}__note name`,
            content: LOCALE.PENDING_INVITATION,
            sys_pn: 'no-answer-list'
          })
        ]
      })
    ]
  });

  const content = Skeletons.Box.X({
    className: contentFig,
    kids: [
      Skeletons.Box.Y({
        className: `${contentFig}__items`,
        kids: [
          Skeletons.Box.Y({
            className: `${contentFig}__item`,
            kids: [
              _ui_.mget(_a.chat) ?
                allConversations : undefined,
              allContacts,
              _ui_.mget(_a.chat) ?
                allShareRoom : undefined,
              tagList
            ]
          }),

          Skeletons.Box.Y({
            className: `${contentFig}__footer`,
            kids: [
              (type === _a.contact) && Visitor.canShow('invite-user') ?
                pendingList : undefined,

              archivedList
            ]
          })
        ]
      })
    ]
  });

  const a = Skeletons.Box.Y({
    debug: __filename,
    className: `${tagsFig}__main`,
    kids: [
      tagHeader,
      separator,
      content
    ]
  });

  return a;
};

module.exports = __skl_addressbook_widget_tag;
