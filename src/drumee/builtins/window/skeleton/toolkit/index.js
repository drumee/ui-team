const { button } = require("../../../skeleton/toolkit/buttons");

const AREA_LABELS = {
  personal: LOCALE.PRIVATE,
  private: LOCALE.RESTRICTED,
  share: LOCALE.SHARED,
  dmz: LOCALE.RESTRICTED,
  restricted: LOCALE.RESTRICTED,
  public: LOCALE.PUBLIC,
};

// True ONLY when the app booted into a DMZ/share recipient session whose share
// does NOT grant chat. Used to hide the chat tab + conversation panel at EVERY
// folder depth: nested subfolders open as plain desk folder windows that lose the
// share's caps, so per-window gating doesn't reach them — but the recipient's
// whole session is one share with fixed caps, so this session-global is correct
// at any depth. Gated on uiRouter.isDmz() (the boot area), so it can NEVER be true
// in a normal desk session → desk folders are completely unaffected. The flag is
// published by the DMZ sharebox on loadDeskContent(); `=== false` means we only
// hide when chat is explicitly not granted (unknown/undefined → show, safe default).
function _dmzShareWithoutChat() {
  const r = (typeof window !== "undefined") && window.uiRouter;
  return !!(r && typeof r.isDmz === "function" && r.isDmz() && r._dmzShareCanChat === false);
}

export function breadcrumbs(ui, opt) {
  return Skeletons.Wrapper.X({
    debug: __filename,
    className: `${ui.fig.group}-breadcrumbs__container`,
    partHandler: ui,
    state: 0,
  });
}

/**
 * Tab bar with Files, Chat, Task buttons (and optional Meeting).
 *
 * Meeting tab opt-in via `opt.meeting`: shared by folder/team/sharebox windows,
 * but only window_folder handles `tab-meeting` (lifecycle via showFolderTab).
 * @param {Object} ui - The widget instance
 * @param {Object} [opt] - { meeting?: boolean } extra tab toggles
 */
export function tabBar(ui, opt = {}) {
  const cnRoot = "window-body__tab-bar";
  const isFolder = ui.fig.family === "window-folder";
  // The folder window and the DMZ share grid use the same emoji tab icons
  // (📄 / 💬 / 📋) — see the reference design. Other non-folder windows keep
  // their monochrome SVG glyphs.
  const useEmojiTabs = isFolder || ui.fig.family === "dmz-sharebox";
  const folderTab = ({ icon, label, service, state, tab }) =>
    Skeletons.Box.X({
      className: `${cnRoot}-item ${ui.fig.family}__tab-bar-item`,
      service,
      state,
      dataset: { tab },
      uiHandler: [ui],
      kids: [
        Skeletons.Note({
          className: `${ui.fig.family}__tab-bar-icon`,
          content: icon,
        }),
        Skeletons.Note({
          className: `${ui.fig.family}__tab-bar-label`,
          content: label,
        }),
      ],
    });

  let chat_tab = folderTab({
    icon: "💬",
    label: LOCALE.CHAT,
    service: "tab-chat",
    state: 0,
    tab: _a.chat,
  });
  let chat_label = Skeletons.Button.Label({
    className: `${cnRoot}-item ${ui.fig.family}__tab-bar-item`,
    label: LOCALE.CHAT,
    ico: "tchat",
    service: "tab-chat",
    state: 0,
    dataset: { tab: _a.chat },
    uiHandler: [ui],
  });

  // Hide the Chat tab only for DMZ shares that don't grant chat. opt.chat is passed
  // as false by the DMZ sharebox; it is undefined for every other caller, so their
  // chat tab is unchanged. _dmzShareWithoutChat() additionally hides it inside nested
  // recipient subfolders (which lose opt.chat). Personal-area folders keep the chat
  // tab — the folder team chat is identical across all areas.
  if (opt.chat === false || _dmzShareWithoutChat()) {
    chat_label = "";
    chat_tab = "";
  }

  const kids = useEmojiTabs
    ? [
        folderTab({
          icon: "📄",
          label: LOCALE.FILES,
          service: "tab-files",
          state: 1,
          tab: "files",
        }),
        chat_tab,
        folderTab({
          icon: "📋",
          label: LOCALE.TASK || "Tasks",
          service: "tab-task",
          state: 0,
          tab: _a.task,
        }),
      ]
    : [
        Skeletons.Button.Label({
          className: `${cnRoot}-item ${ui.fig.family}__tab-bar-item`,
          label: LOCALE.FILES,
          ico: "desktop_docfile",
          service: "tab-files",
          state: 1,
          dataset: { tab: "files" },
          uiHandler: [ui],
        }),
        chat_label,
        Skeletons.Button.Label({
          className: `${cnRoot}-item ${ui.fig.family}__tab-bar-item`,
          label: LOCALE.TASK,
          ico: "list",
          service: "tab-task",
          state: 0,
          dataset: { tab: _a.task },
          uiHandler: [ui],
        }),
      ];

  if (opt.meeting) {
    kids.push(
      Skeletons.Button.Label({
        className: `${cnRoot}-item ${ui.fig.family}__tab-bar-item`,
        label: LOCALE.MEETING,
        ico: "folder-meeting",
        service: "tab-meeting",
        state: 0,
        dataset: { tab: "meeting" },
        uiHandler: [ui],
      }),
    );
  }

  // Member-filter trigger for the Task tab — lives on the same line as the
  // tabs (right-aligned). Hidden until the Task tab is active; the folder
  // window toggles `data-visible` in showFolderTab and reflects the active
  // filter via `data-active` (task-filter-state event from the task panel).
  if (isFolder) {
    kids.push(
      Skeletons.Box.X({
        className: `${ui.fig.family}__tab-filter`,
        sys_pn: "task-filter-btn",
        partHandler: ui,
        dataset: { visible: 0, active: 0 },
        bubble: 0,
        service: "toggle-task-filter",
        uiHandler: [ui],
        kids: [
          Skeletons.Image.Svg({
            ico: "desktop_filter",
            className: `${ui.fig.family}__tab-filter-ico`,
          }),
          Skeletons.Note({
            className: `${ui.fig.family}__tab-filter-label`,
            content: LOCALE.FILTER,
          }),
        ],
      }),
    );
  }

  // File view toggle — a segmented pill with two halves: list (row) and grid.
  // Both halves always render; the half matching the wrapper's data-state is
  // the active view (light-blue fill + a checkmark next to its glyph). Grid is
  // the default (data-state "0"/unset); list is active at data-state "1" (row
  // view). Clicks bubble (kidsOpt active:0) to the wrapper's
  // "toggle-files-layout" service, which flips the state via cmd.changeState().
  // Folder-only: the styling lives in the folder skin, keyed on the
  // `window-folder-topbar` class prefix.
  //
  // Shown only on the Files tab (data-visible toggled by showFolderTab); Files
  // is the default tab, so it renders visible. The layout toggle is irrelevant
  // on the Chat/Task/Meeting tabs.
  const cnTopbar = `${ui.fig.family}-topbar`;
  const viewSegment = (mode, ico) =>
    Skeletons.Box.X({
      className: `${cnTopbar}__view-toggle-seg ${cnTopbar}__view-toggle-seg--${mode}`,
      kidsOpt: { active: 0 },
      kids: [
        Skeletons.Image.Svg({
          ico: "account_check",
          className: `${cnTopbar}__view-toggle-check`,
        }),
        Skeletons.Image.Svg({
          ico,
          className: `${cnTopbar}__view-toggle-glyph`,
        }),
      ],
    });
  // The view toggle is shown for the folder window and the DMZ share grid
  // (both render a media grid that supports a grid ↔ row layout).
  const showViewToggle = isFolder || ui.fig.family === "dmz-sharebox";
  const splitBtn = showViewToggle
    ? Skeletons.Box.X({
        className: `${cnTopbar}__view-toggle`,
        service: "toggle-files-layout",
        sys_pn: "view-ctrl",
        // Explicit data-state (not the `state` prop) guarantees the attribute
        // is present on first render so the correct half is highlighted
        // immediately; grid is the CSS default, so only row/list (state 1)
        // needs it.
        dataset: {
          state: ui.getViewMode && ui.getViewMode() === _a.row ? 1 : 0,
          // Files is the default active tab, so the toggle starts visible.
          visible: 1,
        },
        uiHandler: [ui],
        kidsOpt: { active: 0 },
        kids: [
          viewSegment("list", "view-list"),
          viewSegment("grid", "view-grid"),
        ],
      })
    : "";

  // Tab bar lays out as flex space-between: the tab items group on the left,
  // the view-toggle splitBtn on the right.
  return Skeletons.Box.X({
    className: `${cnRoot}-wrapper ${ui.fig.family}__tab-bar-wrapper`,
    dataset: isFolder ? { area: ui.mget(_a.area) } : {},
    kids: [
      Skeletons.Box.X({
        className: `${cnRoot}-tabs ${ui.fig.family}__tab-bar-tabs`,
        kids,
      }),
      splitBtn,
    ],
  });
}

export function gridFilesBrowser(ui) {
  const pfx = ui.fig.group;
  const type = ui.mget(_a.type);

  let opt = {
    kind: _a.media,
    type,
    logicalParent: ui,
    role: ui.mget(_a.role) || "",
    uiHandler: null,
  };

  if (ui.mget(_a.itemsOpt)) {
    opt = { ...opt, ...ui.mget(_a.itemsOpt) };
  }
  const list = Skeletons.List.Smart({
    className: `${pfx}__icons-list`,
    innerClass: `${pfx}__icons-scroll`,
    sys_pn: _a.list,
    flow: _a.none,
    timer: 2000,
    dataset: {
      role: _a.container,
    },
    spinnerWait: 1500,
    spinner: true,
    itemsOpt: opt,
    skip: {
      filename: /^\./,
    },
    vendorOpt: Preset.List.Orange_e,
    api: function (x) {
      return ui.getCurrentApi();
    },
  });
  if (localStorage.getItem("showHidden")) {
    delete list.skip;
  }

  return list;
}

export function tooltips(ui) {
  return Skeletons.Wrapper.Y({
    className: `${ui.fig.group}__wrapper-tooltips`,
    name: "tooltips",
  });
}

export function dialog(ui) {
  return Skeletons.Wrapper.Y({
    className: `${ui.fig.group}__wrapper-modal`,
    name: "dialog",
    partHandler: ui,
  });
}

/**
 * @typedef {{ service: string, ico: string, content: string, className?: string }} MenuItem
 * @typedef {{
 *   menuItems?: MenuItem[],
 *   triggerIco?: string,
 *   trigger?: any,
 *   sys_pn?: string,
 *   className?: string
 * }} MenuOptions
 */

/**
 * @param {any} ui
 * @param {MenuOptions} opt
 */
export function dropdownMenuButton(ui, opt = {}) {
  const cnRoot = opt.className ?? "window-button";
  const cnDropdown = `${cnRoot}__dropdown-menu`;

  const menuItems = opt.menuItems ?? [];
  const triggerIco = opt.triggerIco ?? "desktop_questionmark";
  const sys_pn = opt.sys_pn ?? "empty_sys_pn";

  const trigger =
    opt.trigger ??
    Skeletons.Button.Svg({
      className: `${cnRoot}__dropdown-button`,
      ico: triggerIco,
      uiHandler: ui,
      partHandler: ui,
    });

  const itemsNode = Skeletons.Box.Y({
    className: `${cnDropdown}__items`,
    kids: menuItems.map(
      ({ service, ico, content, area, className, ...extra }) =>
        Skeletons.Box.X({
          className: className
            ? `${cnDropdown}__item ${className}`
            : `${cnDropdown}__item`,
          uiHandler: [ui],
          service,
          // active:0 on every child so a click on the icon/label passes
          // through to this row (which carries `service`) instead of being
          // swallowed by the interactive Button.Svg / Note.
          kidsOpt: { active: 0 },
          ...extra,
          kids: [
            Skeletons.Button.Svg({
              ico,
              active: 0,
              className: `${cnDropdown}__icon`,
              dataset: area ? { area } : undefined,
            }),
            Skeletons.Note({
              content,
              active: 0,
              className: `${cnDropdown}__name`,
            }),
          ],
        }),
    ),
  });

  return {
    kind: KIND.menu.topic,
    sys_pn,

    className: `${cnDropdown}__wrapper`,

    flow: _a.y,
    opening: _e.click,
    persistence: _a.none,

    trigger,
    items: itemsNode,
  };
}

function getChatLabel(ui) {
  if (ui.fig.family === "window-folder") {
    return LOCALE.FOLDER_SCOPED_CHAT || LOCALE.CHAT;
  }
  // DMZ recipient view: the docked panel is labelled "CONVERSATION" (Figma 3.1),
  // not "<file> - Chat".
  if (ui.fig.family === "dmz-sharebox") {
    return LOCALE.SECURE_SHARE_CONVERSATION || LOCALE.CHAT;
  }
  const name = ui.mget(_a.filename) || ui.mget(_a.name) || "";
  return name ? `${name} - ${LOCALE.CHAT}` : LOCALE.CHAT;
}

/**
 * Header-bar content for the folder team chat. Returns the kids for the
 * .window__chat-header row, swapped live by the folder window
 * (_updateChatHeader) on chat-scope change. Two modes:
 *   folder (Figma 2216-168072) → "Team Chat" title + [3-dot, search]
 *   file   (Figma 2216-166665) → [back] + [paperclip, filename, "File thread"
 *                                 tag] + [3-dot, search]
 * The 3-dot/search actions are identical in both; back reuses
 * thread-menu-general to leave the file thread for the folder ("# General") chat.
 * @param {Object} ui folder window
 * @param {{ fileNid?: string, label?: string }} opt
 */
export function chatHeaderBar(ui, opt = {}) {
  const grp = ui.fig.group;
  const fileNid = opt.fileNid || "";
  const label = opt.label || "";

  // Search (Figma MagnifyingGlass) — click swaps the whole header for a search
  // bar (chatSearchBar) that live-filters the conversation below. The same
  // button renders in all three header modes (general / folder / file), so the
  // search entry point is identical everywhere the icon appears.
  const searchBtn = Skeletons.Button.Svg({
    className: `${grp}__chat-header-btn`,
    ico: "magnifying-glass",
    service: "open-chat-search",
    uiHandler: [ui],
  });

  const actions = Skeletons.Box.X({
    className: `${grp}__chat-header-actions`,
    kids: [
      // 3-dot (Figma DotsThreeVertical) FIRST — opens the thread menu.
      Skeletons.Button.Svg({
        className: `${grp}__chat-header-btn`,
        ico: "apps-dots-vertical",
        service: "open-thread-menu",
        uiHandler: [ui],
        partHandler: ui,
      }),
      searchBtn,
    ],
  });

  // Full Chat-tab middle header (Figma 2331-46821): the docked rail already is
  // the thread switcher, so the 3-dot is dropped and the title reads "# General".
  if (opt.general) {
    return [
      Skeletons.Note({
        className: `${grp}__chat-header-title`,
        content: `# ${LOCALE.GENERAL || "General"}`,
      }),
      Skeletons.Box.X({
        className: `${grp}__chat-header-actions`,
        kids: [searchBtn],
      }),
    ];
  }

  if (fileNid) {
    return [
      Skeletons.Button.Svg({
        className: `${grp}__chat-header-back`,
        ico: "caret-left",
        service: "thread-menu-general",
        uiHandler: [ui],
      }),
      Skeletons.Box.X({
        className: `${grp}__chat-header-file`,
        kids: [
          // Badge wrapper so _hydrateChatHeaderFile can swap the paperclip for
          // the file's vignette thumbnail (image/vector), like the chat card.
          Skeletons.Box.X({
            className: `${grp}__chat-header-file-badge`,
            kids: [
              Skeletons.Image.Svg({
                ico: "app-attachment",
                className: `${grp}__chat-header-file-ico`,
              }),
            ],
          }),
          Skeletons.Note({
            className: `${grp}__chat-header-file-name`,
            // Initial text; _hydrateChatHeaderFile replaces it with the file's
            // real name. Falls back to a short nid tail so it is never nameless.
            content: label || `#${String(fileNid).slice(-6)}`,
          }),
          Skeletons.Note({
            className: `${grp}__chat-header-file-tag`,
            content: LOCALE.FILE_THREAD || "File thread",
          }),
        ],
      }),
      actions,
    ];
  }

  return [
    Skeletons.Note({
      className: `${grp}__chat-header-title`,
      content: getChatLabel(ui),
    }),
    actions,
  ];
}

/**
 * Search-mode content for the `chat-header-bar` part: a back arrow + a single
 * text input that replaces the whole header (Figma magnifying-glass → search).
 * Fed by the folder window (_openChatSearch); the back button restores the
 * previous header (_closeChatSearch) and the input live-filters the conversation
 * below (wired via onPartReady "chat-search-input", no per-keystroke service).
 * @param {Object} ui folder window
 */
export function chatSearchBar(ui) {
  const grp = ui.fig.group;
  return [
    Skeletons.Button.Svg({
      className: `${grp}__chat-header-back`,
      ico: "caret-left",
      service: "close-chat-search",
      uiHandler: [ui],
    }),
    Skeletons.Entry({
      className: `${grp}__chat-search-input`,
      sys_pn: "chat-search-input",
      partHandler: ui,
      placeholder: LOCALE.SEARCH,
      require: "any",
      mode: "interactive",
      interactive: 1,
      bubble: 0,
      // Live filter on each keystroke. The Entry's `<input>` is created
      // asynchronously (waitElement), so a manual addEventListener wired in
      // onPartReady runs before the input exists. `watch` is the framework's
      // built-in hook: it attaches the input listener once the field is ready
      // and fires onUiEvent("chat-search-typed", { value }) on every change.
      watch: "chat-search-typed",
      uiHandler: [ui],
    }),
  ];
}

/**
 *
 * @param {Chat Panel} ui
 * @returns
 */
export function chatPanel(ui) {
  const chat = {
    kind: "widget_chat",
    className: `${ui.fig.group}__chat-widget`,
    type: ui.mget(_a.area),
    area: ui.mget(_a.area),
    view: "quickChat",
    hub_id: ui.mget(_a.hub_id),
    nid: ui.mget(_a.nid),
    privilege: ui.mget(_a.privilege) || ui.mget(_a.permission),
    placeholder: LOCALE.TYPE_MESSAGE + "...",
    // Show the emoji picker icon (lib-messenger__icon emoji) in the panel.
    no_emoji: false,
    send_icon: "raw-send-chat",
    attach_icon: "chat-link-simple",
    sys_pn: "folder-chat",
  };

  // Folder-scoped chat: scope the conversation to the current folder (nid) so
  // only that folder's messages load. Applies to the authenticated folder window
  // AND the DMZ share view — without scope=folder the chat widget omits `nid`
  // from channel.messages (see chat/index.js getScopedNid) and loads the whole
  // hub, pulling in messages from other scopes.
  if (ui.fig.family === "window-folder" || ui.fig.family === "dmz-sharebox") {
    chat.scope = _a.folder;
    chat.type = _a.share;
    chat.area = _a.share;
    chat.hub_id = ui.mget(_a.actual_hub_id) || ui.mget(_a.hub_id);
    chat.nid = ui.mget(_a.nid);
    chat.home_id = ui.mget(_a.home_id);
    chat.ownpath = ui.mget(_a.ownpath);
  }

  // DMZ shared-link recipient (Figma "user chat → sign in required", screen 57):
  // anyone viewing a share via the DMZ sharebox may READ the conversation but
  // must sign up / log in to POST — a send attempt opens the sign-up overlay
  // instead of posting (intercepted in the chat widget's sendMessage). Keyed off
  // the DMZ sharebox identity — NOT `is_guest`, which the server does not
  // reliably set for public shares (it returns is_guest=false, so that gate
  // silently failed). The authenticated window-folder chat has a different
  // fig.family, so it is unaffected and members can still post normally.
  // DMZ share context = the sharebox itself, OR a NESTED window/folder launched from a
  // share (it carries the pinned share token — see dmz/wm getWindowPreset). In both,
  // posting requires an AUTHENTICATED recipient WITH can_chat; everyone else (anonymous,
  // or no chat grant) stays guest_chat = read-only / sign-in-to-post. Without the
  // window-folder branch a nested sub-folder is a normal postable chat, letting an
  // ANONYMOUS viewer post AS the creator. A normal desk folder has no share token, so
  // this block does not apply and its chat is unchanged. (A nested window/folder does
  // not carry is_authenticated/can_chat, so canPost is false there → read-only, which
  // matches the folder-scoped-chat-is-read-only design — recipients post at the share root.)
  const inDmzShare = ui.fig.family === "dmz-sharebox" ||
                     (ui.fig.family === "window-folder" && !!ui.mget(_a.token));
  if (inDmzShare) {
    const canPost = !!(ui.mget('is_authenticated') && ui.mget('can_chat'));
    chat.guest_chat  = canPost ? 0 : 1;
    chat.scoped_post = canPost ? 1 : 0;
    chat.desk = ui;
    // DMZ sharebox conversation: an ANONYMOUS (logged-out) recipient has no
    // identity to align against, so render one uniform column — every message
    // sits on the "other" side via the chat-item-other variant. A LOGGED-IN
    // recipient keeps the normal me/other split (base chat-item), so their own
    // messages right-align. Scoped to the sharebox itself — nested window/folder
    // chats launched from a share keep the normal split regardless.
    if (ui.fig.family === "dmz-sharebox" && !ui.mget('is_authenticated')) {
      chat.item_kind = "widget_chat_item_other";
    }
  }

  // Folder window team chat gets the richer header (title + search + 3-dot menu)
  // and the thread-switch dropdown (Figma 2216-168072 / 2216-170337). Other chat
  // surfaces (dmz-sharebox, in-meeting, …) keep the plain label.
  const grp = ui.fig.group;
  const isFolderChat = ui.fig.family === "window-folder";
  // Folder team chat: a feedable header part the folder window re-feeds via
  // chatHeaderBar when the chat scope switches between folder and a file thread.
  const header = isFolderChat
    ? Skeletons.Box.X({
        className: `${grp}__chat-label ${grp}__chat-header`,
        sys_pn: "chat-header-bar",
        partHandler: ui,
        dataset: { scope: "folder" },
        kids: chatHeaderBar(ui, {}),
      })
    : Skeletons.Note({
        className: `${grp}__chat-label`,
        content: getChatLabel(ui),
      });

  // Chat gate for a view-only member (privilege without the download bit).
  // Drives both the card overlay and the composer blur off a single
  // data-chat_gated flag on the panel; the folder window re-syncs it via
  // _syncChatGate on live role change. Computed here so there is no flash of an
  // enabled composer before the runtime sync.
  const chatGated =
    isFolderChat && !(Number(ui.mget(_a.privilege)) & _K.permission.download)
      ? 1
      : 0;
  return Skeletons.Box.Y({
    className: `${grp}__chat-panel`,
    sys_pn: "chat-panel",
    dataset:
      ui.fig.family === "window-folder"
        ? { area: ui.mget(_a.area), chat_gated: chatGated }
        : {},
    kids: [
      header,
      // File-thread info card slot (Figma 2216-165656) — the in-place (Files
      // tab) file-thread view pins the same card the side panel shows. Empty +
      // hidden until the folder window feeds it on file scope; stays empty for
      // the full-tab middle #General chat (which never file-scopes in place).
      isFolderChat
        ? Skeletons.Box.Y({
            className: `${grp}__chat-info-slot`,
            sys_pn: "chat-info-card",
            partHandler: ui,
            dataset: { open: 0 },
          })
        : null,
      chat,
      // Backend message-search results overlay (channel.search). Covers the
      // message list while the header search bar is open and has a query; the
      // folder window feeds it matching previews (_runChatSearch) and toggles
      // data-open. Hidden by SCSS until data-open="1". Folder team chat only.
      isFolderChat
        ? Skeletons.Box.Y({
            className: `${grp}__search-results`,
            sys_pn: "search-results",
            partHandler: ui,
            dataset: { open: 0 },
          })
        : null,
      // Thread-switch dropdown overlay — populated on open (see folder
      // _toggleThreadMenu); absolute-positioned under the header, hidden until
      // data-open="1".
      isFolderChat
        ? Skeletons.Box.Z({
            className: `${grp}__thread-menu`,
            sys_pn: "thread-menu",
            partHandler: ui,
            dataset: { open: 0 },
          })
        : null,
      // "Need permission to chat" card — the drumee lockup + message shown over
      // the conversation for a view-only member. Always in the DOM; shown by CSS
      // when the panel carries data-chat_gated="1" (set initially above and by
      // _syncChatGate on live role change).
      isFolderChat
        ? Skeletons.Box.Y({
            className: `${grp}__chat-gate`,
            kids: [
              Skeletons.Box.X({
                className: `${grp}__chat-gate-logo`,
                kids: [
                  Skeletons.Image.Svg({
                    ico: "logo-upload",
                    className: `${grp}__chat-gate-logo-ico`,
                  }),
                  Skeletons.Note({
                    className: `${grp}__chat-gate-logo-text`,
                    content: "drumee",
                  }),
                ],
              }),
              Skeletons.Note({
                className: `${grp}__chat-gate-text`,
                content: LOCALE.CHAT_ADMIN_REQUIRED,
              }),
            ],
          })
        : null,
    ].filter(Boolean),
  });
}

/**
 * Content for the chat-header search-results overlay (channel.search). Renders
 * a "Search results" label + one row per matching message (avatar, author,
 * relative time, 150-char preview), or a "No results" note. Each row jumps to
 * the message (search-result-jump) on click. Newest-first (server order).
 * @param {*} ui folder window
 * @param {Array} rows channel.search result rows
 */
export function searchResults(ui, rows) {
  const grp = ui.fig.group;
  const list = Array.isArray(rows) ? rows : [];
  if (!list.length) {
    return [
      Skeletons.Note({
        className: `${grp}__search-results-empty`,
        content: LOCALE.NO_RESULTS || "No results",
      }),
    ];
  }
  const row = (r) => {
    const name = r.fullname || `${r.firstname || ""} ${r.lastname || ""}`.trim();
    let when = "";
    const ts = Number(r.ctime || 0);
    if (ts) {
      try {
        when = Dayjs.unix(ts).fromNow();
      } catch (e) {
        when = "";
      }
    }
    return Skeletons.Box.X({
      className: `${grp}__search-result`,
      service: "search-result-jump",
      message_id: `${r.message_id || r.id || ""}`,
      uiHandler: [ui],
      kidsOpt: { active: 0 },
      kids: [
        // No avatar: the proc returns no avatar URL, so a generated placeholder
        // (color-from-name) was misleading. Show name + time + preview only.
        // active:0 is propagated at EVERY nesting level (kidsOpt per container):
        // each view wires its own onclick that stopPropagation()s and trips the
        // 300ms global click throttle, so a click landing on a nested non-active
        // descendant would be swallowed before it bubbles to the row's service
        // (needing several taps). active:0 leaves them handler-less → the click
        // bubbles straight to the row.
        Skeletons.Box.Y({
          className: `${grp}__search-result-body`,
          kidsOpt: { active: 0 },
          kids: [
            Skeletons.Box.X({
              className: `${grp}__search-result-top`,
              kidsOpt: { active: 0 },
              kids: [
                Skeletons.Note({
                  className: `${grp}__search-result-name`,
                  active: 0,
                  content: name,
                }),
                Skeletons.Note({
                  className: `${grp}__search-result-time`,
                  active: 0,
                  content: when,
                }),
              ],
            }),
            Skeletons.Note({
              className: `${grp}__search-result-preview`,
              active: 0,
              content: r.preview || "",
            }),
          ],
        }),
      ],
    });
  };
  return [
    Skeletons.Note({
      className: `${grp}__search-results-label`,
      content: LOCALE.SEARCH_RESULTS || "Search results",
    }),
    Skeletons.Box.Y({
      className: `${grp}__search-results-list`,
      kids: list.map(row),
    }),
  ];
}

/**
 *
 * @param {*} ui
 * @returns
 */
export function fileTypeFilterBar(ui) {
  const tabs = [
    { label: "All", value: "all" },
    { label: "Docs", value: "docs" },
    { label: "PDF", value: "pdf" },
    { label: "Images", value: "image" },
    { label: "Other", value: "other" },
  ];
  let dataset = ui.mget(_a.area);
  return Skeletons.Box.X({
    className: `${ui.fig.family}__filter-bar`,
    sys_pn: "file-type-filter",
    partHandler: ui,
    dataset: { area: ui.mget(_a.area) },
    kids: tabs.map((tab, index) =>
      button(ui, {
        label: tab.label,
        className: `${ui.fig.family}__filter-tab`,
        service: "filter-by-type",
        state: index === 0 ? 1 : 0,
        radiotoggle: `media-filter-${ui._id}`,
        value: tab.value,
        dataset: { area: ui.mget(_a.area) },
      }),
    ),
  });
}

export function filesContainer(ui) {
  const opt = {
    className: `${ui.fig.family}__files-panel ${ui.fig.group}__files-panel`,
    sys_pn: _a.content,
    type: _a.type,
  };
  if (ui.fig.family === "window-folder") {
    opt.kids = [fileTypeFilterBar(ui), gridFilesBrowser(ui)];
  }
  return Skeletons.Box.Y(opt);
}

export function folderFilesRowContainer(ui) {
  return Skeletons.Box.Y({
    className: `${ui.fig.family}__files-panel ${ui.fig.group}__files-panel`,
    sys_pn: _a.content,
    type: _a.type,
    kids: [require("../content/row")(ui)],
  });
}

/**
 * Persistent left rail for the full Chat tab (Figma 2328-115485) — the same
 * thread list as the header 3-dot dropdown (This Folder → # General + File
 * Threads + Download), but docked instead of floating. Empty feedable part; the
 * folder window populates it (_populateThreadRail) on chat-tab open / folder
 * nav. Only the folder team chat has file threads, so it is null elsewhere;
 * SCSS keeps it hidden except when data-view="chat".
 * @param {*} ui folder window
 */
export function threadRail(ui) {
  if (ui.fig.family !== "window-folder") return null;
  return Skeletons.Box.Y({
    className: `${ui.fig.group}__thread-rail`,
    sys_pn: "thread-rail",
    partHandler: ui,
  });
}

/**
 * Header row for the full Chat-tab file-thread side panel (Figma 2331-47041):
 * paperclip badge (→ vignette by _hydrateChatHeaderFile) + filename + "File
 * thread" pill + X (close). Reuses the chat-header-file-* styling. The X fires
 * close-file-thread-panel on the folder window.
 * @param {*} ui folder window
 * @param {{ fileNid?: string, label?: string }} opt
 */
function fileThreadPanelHeader(ui, opt = {}) {
  const grp = ui.fig.group;
  const fileNid = opt.fileNid || "";
  const label = opt.label || "";
  return Skeletons.Box.X({
    className: `${grp}__chat-header ${grp}__ft-panel-header`,
    sys_pn: "ft-panel-header",
    partHandler: ui,
    dataset: { scope: "file" },
    kids: [
      Skeletons.Box.X({
        className: `${grp}__chat-header-file`,
        kids: [
          Skeletons.Box.X({
            className: `${grp}__chat-header-file-badge`,
            kids: [
              Skeletons.Image.Svg({
                ico: "app-attachment",
                className: `${grp}__chat-header-file-ico`,
              }),
            ],
          }),
          Skeletons.Note({
            className: `${grp}__chat-header-file-name`,
            content: label || `#${String(fileNid).slice(-6)}`,
          }),
          Skeletons.Note({
            className: `${grp}__chat-header-file-tag`,
            content: LOCALE.FILE_THREAD || "File thread",
          }),
        ],
      }),
      Skeletons.Box.X({
        className: `${grp}__chat-header-actions`,
        kids: [
          Skeletons.Button.Svg({
            className: `${grp}__chat-header-btn`,
            ico: "cross",
            service: "close-file-thread-panel",
            uiHandler: [ui],
          }),
        ],
      }),
    ],
  });
}

/**
 * Second chat-widget config for the file-thread side panel — a per-file chat
 * scoped to fileNid, kept fully separate from the middle General chat (distinct
 * storage_key for its draft; matchesScopedChannel keeps their message streams
 * apart). Mirrors chatPanel's folder-scope + DMZ-share guest gating.
 */
function fileThreadChatConfig(ui, fileNid, label, replyData) {
  const grp = ui.fig.group;
  const cfg = {
    kind: "widget_chat",
    className: `${grp}__chat-widget ${grp}__ft-panel-chat`,
    // Match the main #General chat (chatPanel): use the folder's real area, not
    // a hardcoded `share`. type === share makes chat-item render an extra
    // DMZ-share sender avatar (UserProfile, line ~211) on every "other" message,
    // which stacked/overlapped here; the main chat avoided it by keying off the
    // real area. area drives the bubble tint, same as the panel container.
    type: ui.mget(_a.area),
    area: ui.mget(_a.area),
    view: "quickChat",
    scope: _a.folder,
    hub_id: ui.mget(_a.actual_hub_id) || ui.mget(_a.hub_id),
    nid: ui.mget(_a.nid),
    home_id: ui.mget(_a.home_id),
    ownpath: ui.mget(_a.ownpath),
    privilege: ui.mget(_a.privilege) || ui.mget(_a.permission),
    placeholder: LOCALE.TYPE_MESSAGE + "...",
    no_emoji: false,
    send_icon: "raw-send-chat",
    attach_icon: "chat-link-simple",
    scoped_file_nid: fileNid,
    scoped_file_label: label || "",
    // Reply-in-thread: a captured quote to restore in the panel composer once it
    // mounts (the chat widget applies it in initialize). Null in normal opens.
    reply_data: replyData || null,
    storage_key: `ftpanel-${ui.mget(_a.hub_id)}-${ui.mget(_a.nid)}`,
    sys_pn: "file-thread-chat",
    partHandler: ui,
  };
  // A window/folder launched from a share carries the pinned token → recipients
  // post only when authenticated WITH can_chat (same gate as chatPanel).
  const inDmzShare =
    ui.fig.family === "window-folder" && !!ui.mget(_a.token);
  if (inDmzShare) {
    const canPost = !!(ui.mget("is_authenticated") && ui.mget("can_chat"));
    cfg.guest_chat = canPost ? 0 : 1;
    cfg.scoped_post = canPost ? 1 : 0;
    cfg.desk = ui;
  }
  return cfg;
}

/**
 * Info card pinned at the top of the file-thread panel body (Figma 2216-165656)
 * — same shape as the General chat's file-thread card, but "Open thread →" is
 * replaced by "Open file →" (opens the file's viewer). Name / replies / time /
 * vignette are filled by the folder window from channel.file_thread_info (the
 * same fetch that hydrates the header); only "Open file →" is interactive.
 * @param {*} ui folder window
 * @param {{ fileNid: string, label?: string }} opt
 */
export function fileThreadInfoCard(ui, opt = {}) {
  const grp = ui.fig.group;
  const fileNid = opt.fileNid || "";
  const label = opt.label || "";
  return Skeletons.Box.X({
    className: `${grp}__ft-info-card`,
    kids: [
      Skeletons.Box.X({
        className: `${grp}__ft-info-badge`,
        kids: [
          Skeletons.Image.Svg({
            ico: "app-attachment",
            className: `${grp}__ft-info-ico`,
          }),
        ],
      }),
      Skeletons.Box.Y({
        className: `${grp}__ft-info-body`,
        kids: [
          Skeletons.Box.X({
            className: `${grp}__ft-info-top`,
            kids: [
              Skeletons.Note({
                className: `${grp}__ft-info-name`,
                content: label || `#${String(fileNid).slice(-6)}`,
              }),
              Skeletons.Note({
                className: `${grp}__ft-info-open`,
                content: `${LOCALE.OPEN_FILE || "Open file"} →`,
                service: "open-file-from-thread",
                file_nid: fileNid,
                uiHandler: [ui],
              }),
            ],
          }),
          Skeletons.Box.X({
            className: `${grp}__ft-info-meta`,
            kids: [
              Skeletons.Image.Svg({
                ico: "chat-teardrop-dots",
                className: `${grp}__ft-info-meta-ico`,
              }),
              // Filled by _fillFileInfoCard; empty Notes render nothing.
              Skeletons.Note({ className: `${grp}__ft-info-replies`, content: "" }),
              Skeletons.Note({ className: `${grp}__ft-info-dot`, content: "" }),
              Skeletons.Note({ className: `${grp}__ft-info-time`, content: "" }),
            ],
          }),
        ],
      }),
    ],
  });
}

/**
 * Content fed into the file-thread side panel when a thread opens: [header,
 * info card, scoped chat widget]. Returned as an array (the panel part itself
 * is the Box.Y; see fileThreadPanel).
 * @param {*} ui folder window
 * @param {{ fileNid: string, label?: string }} opt
 */
export function fileThreadPanelContent(ui, opt = {}) {
  return [
    fileThreadPanelHeader(ui, opt),
    fileThreadInfoCard(ui, opt),
    fileThreadChatConfig(ui, opt.fileNid || "", opt.label || "", opt.replyData),
  ];
}

/**
 * Empty docked side panel (3rd column of the full Chat tab) that hosts the
 * file-thread chat. Populated lazily by the folder window (_openFileThreadPanel)
 * and hidden by SCSS until the split-body carries data-thread="open". Only the
 * folder team chat has file threads → null elsewhere.
 * @param {*} ui folder window
 */
export function fileThreadPanel(ui) {
  if (ui.fig.family !== "window-folder") return null;
  return Skeletons.Box.Y({
    className: `${ui.fig.group}__file-thread-panel`,
    sys_pn: "file-thread-panel",
    partHandler: ui,
    // Carry the folder's area so the side panel's own-message bubbles get the
    // SAME area tint as the General chat (the bubble rules key off data-area;
    // without it the panel falls back to the saturated default fill).
    dataset: { open: 0, area: ui.mget(_a.area) },
  });
}

/**
 * Draggable gutter between the Files-tab file grid and the team-chat panel.
 * Absolutely positioned at the files/chat boundary (so it never participates in
 * the split-body grid's auto-placement); the folder window wires pointer drag on
 * it to resize within 1:1 ↔ 2:1. Hidden by SCSS outside the Files view and in
 * the compact ≤700px single-column layout. active:0 → no click service; the drag
 * is wired manually in folder._wireFilesSplitter. No `service` → no onUiEvent.
 */
export function filesSplitter(ui) {
  return Skeletons.Box.Y({
    className: `${ui.fig.family}__files-splitter ${ui.fig.group}__files-splitter`,
    sys_pn: "files-splitter",
    partHandler: ui,
  });
}

export function folderFilesView(ui) {
  const files =
    ui.getViewMode && ui.getViewMode() === _a.row
      ? folderFilesRowContainer(ui)
      : filesContainer(ui);
  // Recipient subfolder of a no-chat share → files only (no conversation panel).
  // Personal-area folders keep the chat panel — folder chat is identical across areas.
  if (_dmzShareWithoutChat()) return [files];
  // [files, splitter, rail, chat, file-thread panel] — the resize gutter sits
  // BETWEEN files and chat so grid auto-placement lays it out as the middle
  // column in the Files view (files | gutter | chat); rail + panel flank the
  // chat in the full Chat tab. All hidden by SCSS outside their state (splitter:
  // only files view; rail: only chat view; panel: only data-thread="open").
  return [
    files,
    filesSplitter(ui),
    threadRail(ui),
    chatPanel(ui),
    fileThreadPanel(ui),
  ].filter(Boolean);
}

export function folderChatView(ui) {
  const panel = chatPanel(ui);
  panel.className = `${panel.className} ${ui.fig.family}__chat-panel-full`;
  return panel;
}

/**
 *
 * @param {*} ui
 * @returns
 */
export function splitBody(ui) {
  return Skeletons.Box.G({
    className: `${ui.fig.family}__split-body ${ui.fig.group}__split-body`,
    sys_pn: "folder-view",
    partHandler: ui,
    dataset: { view: "files" },
    kids: folderFilesView(ui),
  });
}

/**
 *
 * @param {*} ui
 * @returns
 */
export function windowHeader(ui, topbar) {
  return Skeletons.Box.X({
    debug: __filename,
    className: `${ui.fig.family}__header ${ui.fig.group}__header`,
    sys_pn: "window-header",
    kidsOpt: {
      radio: _a.on,
      uiHandler: [ui],
    },
    service: _e.raise,
    kids: [topbar],
  });
}

/**
 *
 * @param {*} ui
 * @returns
 */
export function newFileMenu(ui, opt = {}) {
  const cnWindowButton = `${ui.fig.group}-button`;
  const cnWindowBody = `${ui.fig.group}-split-body`;
  const triggerIco = opt.triggerIco || "editbox_list-plus";
  const cnItem = `${cnWindowButton}__menu-item`;
  const allItems = [
    {
      service: "add-folder",
      ico: "folder-header",
      content: LOCALE.FOLDER,
      // The folder glyph is monochrome (fill:currentColor) and is tinted by its
      // data-area accent. opt.area lets a caller force the accent (the DMZ share
      // view passes its share area so the folder matches the header/badge accent
      // instead of defaulting to the neutral "personal" tint = looks black).
      area: opt.area || ui.mget(_a.area) || _a.personal,
      filename: LOCALE.NEW_FOLDER,
      className: `${cnItem} ${cnItem}--add-folder`,
    },
    {
      service: "add-note",
      ico: "raw-note",
      content: LOCALE.NOTE,
      className: `${cnItem} ${cnItem}--add-note white`,
    },
    {
      service: "new-document",
      name: "document.docx",
      ico: "raw-documents_word",
      content: LOCALE.DOCUMENT,
      className: `${cnItem} ${cnItem}--document white`,
    },
    {
      service: "new-document",
      name: "spreadsheet.xlsx",
      ico: "raw-documents_excel",
      content: LOCALE.SPREADSHEET,
      className: `${cnItem} ${cnItem}--spreadsheet white`,
    },
    {
      service: "new-document",
      name: "presentation.pptx",
      ico: "raw-documents_powerpoint",
      content: LOCALE.PRESENTATION,
      className: `${cnItem} ${cnItem}--presentation white`,
    },
  ];
  // opt.items — optional whitelist of service names. When set, only those
  // menu items render (e.g. DMZ share passes ["add-folder"]).
  const menuItems = opt.items
    ? allItems.filter((it) => opt.items.includes(it.service))
    : allItems;
  return Skeletons.Box.X({
    className: `${cnWindowBody}__buttons-container`,
    kids: [
      dropdownMenuButton(ui, {
        className: cnWindowButton,

        trigger: Skeletons.Button.Label({
          className: `${cnWindowButton}__label-button secondary`,
          label: LOCALE.ADD_NEW || "Add new",
          ico: triggerIco,
          uiHandler: ui,
          partHandler: ui,
        }),

        menuItems,
      }),
    ],
  });
}

/**
 *
 * @param {*} ui
 */
export function visioMenu(ui, opt = {}) {
  const cnWindowButton = `${ui.fig.group}-button`;
  const triggerIco = opt.triggerIco || "desktop_confcalls";
  if (!Visitor.canUseVisio() || ui.mget(_a.area) == _a.personal) return "";
  return dropdownMenuButton(ui, {
    className: cnWindowButton,

    trigger: Skeletons.Button.Svg({
      className: `${cnWindowButton}__icon-bg-button primary`,
      ico: triggerIco,
      uiHandler: ui,
      partHandler: ui,
    }),

    menuItems: [
      {
        service: "meeting",
        ico: "logo-google",
        content: LOCALE.GOOGLE_MEET,
      },
      { service: "webinar", ico: "desktop_confcalls", content: LOCALE.ZOOM },
      {
        service: "channel",
        ico: "desktop_confcalls",
        content: LOCALE.MICROSOFT_TEAMS,
      },
      {
        service: "channel",
        ico: "raw-logo-drumee-icon",
        content: LOCALE.DRUMEE_CALL,
      },
    ],
  });
}

/**
 * macOS-style zoom menu — icon trigger with a CSS-hover dropdown offering
 * Enter/Exit Full Screen, Zoom, Tile Left/Right, Reframe. Clicking the
 * trigger toggles Zoom directly.
 *
 * @param {*} ui
 */
export function zoomMenu(ui) {
  const cnRoot = `${ui.fig.family}-topbar__zoom`;

  const items = [
    {
      service: "window-zoom",
      ico: "desktop_fullview",
      // Dedicated key (not LOCALE.ZOOM, which labels the Zoom video app) so
      // this "maximize window" action can be translated independently.
      content: LOCALE.WINDOW_ZOOM,
      modifier: "zoom",
    },
    {
      service: "window-tile-left",
      ico: "square-split-horizontal",
      content: LOCALE.TILE_LEFT,
      modifier: "tile-left",
    },
    {
      service: "window-tile-right",
      ico: "square-split-horizontal",
      content: LOCALE.TILE_RIGHT,
      modifier: "tile-right",
    },
    {
      service: "window-reframe",
      ico: "desktop_reduce",
      content: LOCALE.REFRAME,
      modifier: "reframe",
    },
  ];

  return Skeletons.Box.X({
    className: `${cnRoot}-wrapper`,
    kids: [
      Skeletons.Button.Svg({
        ico: "desktop_fullview",
        className: `${cnRoot}-trigger`,
        sys_pn: "ctrl-fullscreen",
        service: "window-zoom",
        uiHandler: [ui],
        partHandler: ui,
      }),
      Skeletons.Box.Y({
        className: `${cnRoot}-menu`,
        kids: items.map(({ service, ico, content, modifier }) =>
          Skeletons.Box.X({
            className: `${cnRoot}-item ${cnRoot}-item--${modifier}`,
            uiHandler: [ui],
            service,
            kidsOpt: { active: 0 },
            kids: [
              Skeletons.Button.Svg({
                ico,
                active: 0,
                className: `${cnRoot}-item-icon`,
              }),
              Skeletons.Note({
                content,
                active: 0,
                className: `${cnRoot}-item-label`,
              }),
            ],
          }),
        ),
      }),
    ],
  });
}

/**
 * Overflow "More" menu — an icon trigger with a CSS-hover dropdown that
 * holds the right-cluster actions which collapse out of the row on a
 * narrow window (≤700px container width): Meeting, Manage access, Settings.
 *
 * Each item carries the SAME service as the standalone button it stands in
 * for, and is gated by the SAME condition, so the menu is a faithful mirror
 * of the inline controls. In a share-recipient context (a window carrying a
 * pinned share token) none of these chrome actions apply, so the helper
 * returns "" — no orphan trigger.
 *
 * Always rendered into the row; CSS toggles its visibility against the inline
 * buttons by container width (see the ≤700px block in the folder skin).
 *
 * @param {*} ui
 */
export function topbarMoreMenu(ui) {
  const cnRoot = `${ui.fig.family}-topbar__more`;
  const inShare = !!ui.mget(_a.token);
  const area = ui.mget(_a.area);

  const items = [];
  if (!inShare) {
    items.push({
      service: "tab-meeting",
      ico: "video-camera-header",
      content: LOCALE.MEETING,
      modifier: "video",
    });
  }
  // Manage Access mirrors the share control-icon: share areas + workspace ROOT
  // only (filetype === hub). Sub-folders already share via their right-click
  // "Share" menu, so this entry is redundant there — keep in sync with topbar.js.
  const isRoot = ui.mget(_a.filetype) === _a.hub && ui.mget(_a.actual_home_id);
  if (!inShare && area === _a.share && isRoot) {
    items.push({
      service: "folder-manage-access",
      ico: "app-share",
      content: LOCALE.MANAGE_ACCESS,
      modifier: "share",
    });
  }
  if (!inShare) {
    items.push({
      service: _e.settings,
      ico: "gear-header",
      content: LOCALE.SETTINGS,
      modifier: "settings",
    });
  }

  if (!items.length) return "";

  return Skeletons.Box.X({
    className: `${cnRoot}-wrapper`,
    kids: [
      Skeletons.Button.Svg({
        ico: "apps-dots-vertical",
        className: `${cnRoot}-trigger`,
        sys_pn: "topbar-more",
        uiHandler: [ui],
        partHandler: ui,
      }),
      Skeletons.Box.Y({
        className: `${cnRoot}-menu`,
        kids: items.map(({ service, ico, content, modifier }) =>
          Skeletons.Box.X({
            className: `${cnRoot}-item ${cnRoot}-item--${modifier}`,
            uiHandler: [ui],
            service,
            kidsOpt: { active: 0 },
            kids: [
              Skeletons.Button.Svg({
                ico,
                active: 0,
                className: `${cnRoot}-item-icon`,
              }),
              Skeletons.Note({
                content,
                active: 0,
                className: `${cnRoot}-item-label`,
              }),
            ],
          }),
        ),
      }),
    ],
  });
}

/**
 *
 * @param {*} ui
 * @returns
 */
export function getAreaLabel(area) {
  return AREA_LABELS[area] || "";
}
