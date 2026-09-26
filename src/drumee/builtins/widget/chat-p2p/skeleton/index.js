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
      // `active: 0` on the track AND the thumb: kidsOpt reaches direct kids
      // only, and a clickable thumb swallowed every click that landed on it —
      // which is most clicks aimed at a switch — so the toggle only answered
      // on its label and the track's edges.
      Skeletons.Box.X({
        className: `${fig}__toggle-track`,
        active: 0,
        kids: [Skeletons.Box.X({ className: `${fig}__toggle-thumb`, active: 0 })],
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

  // Direct Chat / Workspace chat (Figma 43:32209). Two different QUERIES
  // (chat.chat_rooms with flag=contact vs chat.share_rooms /
  // group_chat_rooms), so each tab has its own list below; picking a tab
  // shows its list and parks the other's conversation (_selectScope in
  // ../index.js). `scope-tab-*` lets a scope chosen in code set the tabs.
  const scope = ui._roomScope || "direct";
  const scopeTab = ({ label, key, service, countPn }) =>
    Skeletons.Box.X({
      className: `${fig}__filter-btn`,
      sys_pn: `scope-tab-${key}`,
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

  // One list per source, both kept mounted; the root's data-scope shows one
  // (skin). Each is bound to its OWN api — see getDirectApi in ../index.js.
  // Separate radio channels, so selecting a row in one list does not clear
  // the other tab's selection.
  const roomList = ({ pn, mod, api, radio }) =>
    Skeletons.List.Smart({
      className: `${fig}__contact-list ${fig}__contact-list--${mod}`,
      sys_pn: pn,
      spinner: true,
      spinnerWait: 300,
      vendorOpt: Preset.List.Orange_e,
      placeholder: Skeletons.Note(LOCALE.NO_CONTACT, "no-contact"),
      itemsOpt: {
        kind: "chat_contact_item",
        service: "load-conversation",
        radio,
        uiHandler: [ui],
      },
      api,
    });

  const contactList = roomList({
    pn: "contact-list",
    mod: "direct",
    api: ui.getDirectApi,
    radio: ui._radioId,
  });

  // Starts with an empty api and is restarted on the tab's first visit
  // (getWorkspaceApi / _loadWorkspaceList): its query is the costly one.
  const workspaceList = roomList({
    pn: "contact-list-ws",
    mod: "workspace",
    api: ui.getWorkspaceApi,
    radio: `${ui._radioId}-ws`,
  });

  const allReadEmpty = Skeletons.Note({
    className: `${fig}__all-read-empty`,
    sys_pn: "all-read-empty",
    partHandler: ui,
    content: LOCALE.ALL_READ || "All read",
  });

  // Conversation search — Figma 43:32209, between the scope tabs and the list:
  // a 33px pill on 5% black (r=12) with a 16px magnifier and "Search...".
  //
  // `watch` rather than a per-keystroke `service`: the Entry's <input> is
  // created asynchronously, so a listener wired in onPartReady would run
  // before it exists. watch is the framework's own hook — it attaches once the
  // field is ready and fires onUiEvent("inbox-search-typed", { value }) on
  // every change. Same mechanism the folder window's chat search uses.
  const searchBar = Skeletons.Box.X({
    className: `${fig}__list-search`,
    kids: [
      Skeletons.Image.Svg({
        className: `${fig}__list-search-icon`,
        ico: "magnifying-glass",
      }),
      Skeletons.Entry({
        className: `${fig}__list-search-input`,
        sys_pn: "list-search",
        partHandler: ui,
        placeholder: LOCALE.SEARCH || "Search...",
        require: "any",
        mode: "interactive",
        interactive: 1,
        bubble: 0,
        watch: "inbox-search-typed",
        uiHandler: [ui],
      }),
    ],
  });

  const sidebar = Skeletons.Box.Y({
    className: `${fig}__sidebar`,
    kids: [sidebarHeader, filters, searchBar, contactList, workspaceList, allReadEmpty],
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

  // In-Inbox image / video viewer (./lightbox, chat_p2p.previewMedia).
  // Empty — and therefore hidden — until an attachment is opened.
  const lightbox = Skeletons.Wrapper.Y({
    className: `${fig}__lightbox`,
    name: "lightbox",
  });

  return Skeletons.Box.X({
    className: `${fig}__main`,
    debug: __filename,
    kids: [sidebar, chatArea, overlayWrapper, lightbox],
  });
};
