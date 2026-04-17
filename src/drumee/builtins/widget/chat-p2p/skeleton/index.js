/**
 * chat_p2p skeleton — two-panel layout: contact inbox (left) + chat area (right)
 * @param {*} ui
 * @returns
 */
module.exports = function (ui) {
  const fig = ui.fig.family;

  // ── Left panel: inbox ────────────────────────────────────────────

  const sidebarHeader = Skeletons.Box.X({
    className: `${fig}__sidebar-header`,
    kids: [
      Skeletons.Note({
        className: `${fig}__inbox-title`,
        content: LOCALE.INBOX || "Inbox",
      }),
      Skeletons.Button.Svg({
        ico: "dock-note",
        className: `${fig}__compose-btn`,
        service: "new-conversation",
        uiHandler: ui,
      }),
    ],
  });

  const filterRadio = `${fig}__filter`;

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
      Skeletons.Button.Label({
        className: `${fig}__filter-btn`,
        label: LOCALE.MENTIONS || "Mentions",
        radio: filterRadio,
        initialState: 0,
        service: "filter-mentions",
        uiHandler: ui,
      }),
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
      flag: "contact",
      uiHandler: [ui],
    },
    api: ui.getCurrentApi,
  });

  const sidebar = Skeletons.Box.Y({
    className: `${fig}__sidebar`,
    kids: [sidebarHeader, filters, contactList],
  });

  // ── Right panel: chat area ───────────────────────────────────────

  const chatHeader = Skeletons.Box.X({
    className: `${fig}__chat-header`,
    sys_pn: "chat-header",
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

  return Skeletons.Box.X({
    className: `${fig}__main`,
    debug: __filename,
    kids: [sidebar, chatArea],
  });
};
