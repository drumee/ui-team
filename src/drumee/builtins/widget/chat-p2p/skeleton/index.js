/**
 * chat_p2p skeleton — two-panel layout: contact inbox (left) + chat area (right)
 * @param {*} ui
 * @returns
 */
module.exports = function (ui) {
  const fig = ui.fig.family;

  // ── Left panel: inbox ────────────────────────────────────────────

  const composePopup = Skeletons.Box.Y({
    className: `${fig}__compose-popup`,
    sys_pn: "compose-popup",
    partHandler: ui,
    state: 0,
    kids: [
      Skeletons.Entry({
        className: `${fig}__compose-search`,
        sys_pn: "compose-search",
        partHandler: ui,
        placeholder: LOCALE.SEARCH || "Search",
        require: "any",
        mode: "interactive",
        interactive: 1,
        service: "compose-search",
        bubble: 0,
        uiHandler: [ui],
      }),
      Skeletons.List.Smart({
        className: `${fig}__compose-list`,
        sys_pn: "compose-list",
        partHandler: ui,
        spinner: true,
        spinnerWait: 300,
        vendorOpt: Preset.List.Orange_e,
        placeholder: Skeletons.Note(LOCALE.NO_CONTACT || "No contacts", "no-contact"),
        itemsOpt: {
          kind: "chat_contact_item",
          service: "compose-pick",
          uiHandler: [ui],
        },
        api: ui.getContactsApi,
      }),
    ],
  });

  const composeWrapper = Skeletons.Box.Y({
    className: `${fig}__compose-wrapper`,
    kids: [
      Skeletons.Button.Svg({
        ico: "dock-note",
        className: `${fig}__compose-btn`,
        service: "toggle-compose",
        uiHandler: ui,
      }),
      composePopup,
    ],
  });

  // Closes the whole chat-p2p panel (Desk.togglePanel). Lives in the
  // sidebar header next to the compose button — the chat header no longer
  // carries it.
  const closeBtn = Skeletons.Button.Svg({
    ico: "account_cross",
    className: `${fig}__close-btn`,
    service: "close-chat",
    uiHandler: ui,
  });

  const sidebarActions = Skeletons.Box.X({
    className: `${fig}__sidebar-actions`,
    kids: [composeWrapper, closeBtn],
  });

  const sidebarHeader = Skeletons.Box.X({
    className: `${fig}__sidebar-header`,
    kids: [
      Skeletons.Note({
        className: `${fig}__inbox-title`,
        content: LOCALE.INBOX || "Inbox",
      }),
      sidebarActions,
    ],
  });

  const filterRadio = `${fig}__filter`;

  // Third filter, for the account that ANSWERS support: their inbox mixes
  // support requests with colleague chats, and this is how they separate the
  // two. Everyone else has at most one support conversation and needs no tab.
  const answersSupport =
    typeof Desk !== "undefined" &&
    _.isFunction(Desk.isSupportContact) &&
    Desk.isSupportContact();

  const filters = Skeletons.Box.X({
    className: `${fig}__filters`,
    kids: [
      Skeletons.Button.Label({
        className: `${fig}__filter-btn`,
        label: LOCALE.ALL || "All",
        radio: filterRadio,
        initialState: 1,
        service: "filter-all",
        uiHandler: ui,
      }),
      Skeletons.Button.Label({
        className: `${fig}__filter-btn`,
        label: LOCALE.UNREADS || "Unread",
        radio: filterRadio,
        initialState: 0,
        service: "filter-unread",
        uiHandler: ui,
      }),
      answersSupport
        ? Skeletons.Button.Label({
            className: `${fig}__filter-btn`,
            label: LOCALE.SUPPORT_LABEL,
            radio: filterRadio,
            initialState: 0,
            service: "filter-support",
            uiHandler: ui,
          })
        : null,
    ],
  });

  const contactList = Skeletons.List.Smart({
    className: `${fig}__contact-list`,
    sys_pn: "contact-list",
    spinner: true,
    spinnerWait: 300,
    vendorOpt: Preset.List.Orange_e,
    placeholder: Skeletons.Note(LOCALE.NO_CONTACT, "no-contact"),
    itemsOpt: {
      kind: "chat_contact_item",
      service: "load-conversation",
      radio: ui._radioId,
      uiHandler: [ui],
    },
    api: ui.getCurrentApi,
  });

  const allReadEmpty = Skeletons.Note({
    className: `${fig}__all-read-empty`,
    sys_pn: "all-read-empty",
    partHandler: ui,
    content: LOCALE.ALL_READ || "All read",
  });

  const sidebar = Skeletons.Box.Y({
    className: `${fig}__sidebar`,
    kids: [sidebarHeader, filters, contactList, allReadEmpty],
  });

  // ── Right panel: chat area ───────────────────────────────────────

  const chatHeader = Skeletons.Box.X({
    className: `${fig}__chat-header`,
    sys_pn: "chat-header",
    kids: [require('./chat-header')(ui, null)],
  });

  const chatPanel = Skeletons.Box.Y({
    className: `${fig}__chat-panel`,
    sys_pn: "chat-panel",
    // kids: [
    //   {
    //     kind: 'widget_chat',
    //     area: _a.personal,
    //     hub_id: Visitor.id
    //   }
    // ]
  });

  const chatArea = Skeletons.Box.Y({
    className: `${fig}__chat-area`,
    kids: [chatHeader, chatPanel],
  });

  // Forward overlay — mirrors window_bigchat overlay structure so that
  // widget_chat_item_forward (which calls 'close-overlay') works unchanged.
  const overlayWrapper = Skeletons.Box.X({
    className: `${fig}__overlay-wrapper`,
    sys_pn: 'overlay-wrapper',
    partHandler: ui,
    dataset: { mode: _a.closed },
    kids: [
      Skeletons.Box.X({ className: 'overlay' }),
      Skeletons.Wrapper.X({ className: 'chat-overlay', name: 'chat-overlay' }),
    ],
  });

  return Skeletons.Box.X({
    className: `${fig}__main`,
    debug: __filename,
    kids: [sidebar, chatArea, overlayWrapper],
  });
};
