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

  // Unreads moved out of the tab row and into the header (Figma 43:32209) —
  // it is orthogonal to WHICH conversations you are looking at, so it composes
  // with the Direct/Workspace tabs instead of competing with them for the same
  // radio group. Mirrors the notifications panel's toggle.
  const unreadToggle = Skeletons.Box.X({
    className: `${fig}__unread-toggle`,
    sys_pn: "unread-toggle",
    service: "toggle-unreads",
    state: ui._unreadOnly ? 1 : 0,
    uiHandler: [ui],
    partHandler: ui,
    kidsOpt: { active: 0 },
    kids: [
      Skeletons.Note({
        className: `${fig}__unread-label`,
        content: LOCALE.UNREADS,
      }),
      Skeletons.Box.X({
        className: `${fig}__toggle-track`,
        kids: [Skeletons.Box.X({ className: `${fig}__toggle-thumb` })],
      }),
    ],
  });

  const sidebarActions = Skeletons.Box.X({
    className: `${fig}__sidebar-actions`,
    kids: [unreadToggle, composeWrapper, closeBtn],
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

  // Direct Chat / Workspace chat (Figma 43:32209). Unlike the old
  // All / Unread / Support row these are not a client-side show/hide over one
  // list — they are two different QUERIES (chat.chat_rooms with flag=contact
  // vs chat.share_rooms / group_chat_rooms), so picking one restarts the list.
  // See getCurrentApi + _setRoomScope in ../index.js.
  const scope = ui._roomScope || "direct";
  const scopeTab = ({ label, key, service, countPn }) =>
    Skeletons.Box.X({
      className: `${fig}__filter-btn`,
      radio: filterRadio,
      state: key === scope ? 1 : 0,
      service,
      uiHandler: [ui],
      kidsOpt: { active: 0 },
      kids: [
        Skeletons.Note({
          className: `${fig}__filter-label`,
          content: label,
        }),
        // Per-tab unread count. Built here and hidden until filled; nothing
        // populates it yet — chat_rooms carries per-ROOM counts, not a
        // per-scope total.
        Skeletons.Note({
          className: `${fig}__filter-count`,
          sys_pn: countPn,
          partHandler: ui,
          content: "",
          attrOpt: { "data-count": 0 },
        }),
      ],
    });

  const filters = Skeletons.Box.X({
    className: `${fig}__filters`,
    kids: [
      scopeTab({
        label: LOCALE.DIRECT_CHAT,
        key: "direct",
        service: "filter-direct",
        countPn: "count-direct",
      }),
      scopeTab({
        label: LOCALE.WORKSPACE_CHAT,
        key: "workspace",
        service: "filter-workspace",
        countPn: "count-workspace",
      }),
      // Kept beyond the design: the account that ANSWERS support needs to
      // separate support requests from colleague chats, and 43:32209 is drawn
      // for an ordinary user who has at most one support conversation. Hidden
      // for everyone else, so it costs the designed layout nothing.
      answersSupport
        ? scopeTab({
            label: LOCALE.SUPPORT_LABEL,
            key: "support",
            service: "filter-support",
            countPn: "count-support",
          })
        : null,
    ].filter(Boolean),
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
