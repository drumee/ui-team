const { button } = require("../../../skeleton/toolkit/buttons");
const { isGrouped } = require("./file-group");

const AREA_LABELS = {
  // Personal workspaces are personal-area folders at the home root.
  personal: LOCALE.PERSONAL,
  private: LOCALE.INTERNAL,
  share: LOCALE.EXTERNAL,
  dmz: LOCALE.RESTRICTED,
  restricted: LOCALE.RESTRICTED,
  public: LOCALE.PUBLIC,
};

// True ONLY when the app booted into a DMZ/share recipient session whose share
// does NOT grant chat. Used to hide the chat tab + conversation panel at EVERY
// folder depth: nested subfolders open as plain desk folder windows that lose the
// share's caps, so per-window gating doesn't reach them — but the recipient's
// whole session is one share with fixed caps, so this session-global is correct
// at any depth. The flag is published by the DMZ sharebox on loadDeskContent();
// `=== false` means we only hide when chat is explicitly not granted
// (unknown/undefined → show, safe default).
// ⚠️ The uiRouter.isDmz() this used to gate on is ALWAYS FALSE in production —
// it tests bootstrap().area, and intEnv() (src/drumee/api.js) builds the env with
// no `area` key at all (yp.get_env exposes area only under `hub`). So this helper
// never returned true on prod: the chat tab AND the conversation panel both stayed
// mounted inside nested subfolders of a share that grants no chat, which is exactly
// the "chat visible before permission" exposure the callers exist to prevent. It was
// masked at the share root, where the sharebox passes opt.chat === false explicitly.
// Now gated on the structural predicate instead (same one the posting gates use).
// `_dmzShareCanChat` is published from exactly ONE place — dmz/sharebox/index.js
// loadDeskContent(), as `!!this.mget('can_chat')` — so `=== false` can only mean the
// sharebox declared this share has no chat grant. Unset/undefined (boot race, or any
// desk session) → false → chat SHOWN, i.e. the pre-existing safe default.
function _dmzShareWithoutChat(ui) {
  if (!_inDmzShare(ui)) return false;
  const r = (typeof window !== "undefined") && window.uiRouter;
  return !!(r && r._dmzShareCanChat === false);
}

// True in a DMZ share view: the sharebox itself, OR a NESTED window/folder opened
// from a share (dmz/wm getWindowPreset pins the share token onto every window it
// launches, at every nesting level, so the token is the reliable marker one or more
// layers deep). Same expression the chatPanel/fileThreadPanel posting gates below
// already use — deliberately NOT uiRouter.isDmz(), which reads bootstrap().area: the
// env served on the share host carries no top-level `area` (only hub.area), so that
// test is always false and would silently never fire. A normal desk folder window
// has no share token, so desk/team/sharebox windows are unaffected — the Meeting tab
// is already gated on this very signal (`meeting: !ui.mget(_a.token)`).
function _inDmzShare(ui) {
  if (!ui || !ui.fig) return false;
  if (ui.fig.family === "dmz-sharebox") return true;
  // Defensive: a throw here would take down the whole tab bar render.
  return ui.fig.family === "window-folder" &&
         typeof ui.mget === "function" && !!ui.mget(_a.token);
}

export function breadcrumbs(ui, opt) {
  return Skeletons.Wrapper.X({
    debug: __filename,
    className: `${ui.fig.group}-breadcrumbs__container`,
    partHandler: ui,
    state: 0,
  });
}

function fileViewToggle(ui, opt = {}) {
  const cnTopbar = `${ui.fig.family}-topbar`;
  const modes = opt.modes || [
    { mode: "list", ico: "view-list" },
    { mode: "grid", ico: "view-grid" },
  ];
  const listMode = ui.getViewMode && ui.getViewMode() === _a.row;
  const state = opt.namedState
    ? isGrouped(ui)
      ? "group"
      : listMode
        ? "list"
        : "grid"
    : listMode ? 1 : 0;
  // With three modes the control has to behave as a radio group: pressing a
  // segment must select THAT mode. Each segment therefore carries the service
  // and its own `value`, so the handler is told which one was pressed instead of
  // inferring it. Only the box was clickable before, which is why the two-mode
  // control could get away with cycling — it had a single alternative.
  //
  // `bubble: false` keeps the press on the segment (the box below also declares
  // the service for the two-mode DMZ control, which still cycles). Pattern
  // follows the checkout pill bar in widget/settings/account/billing.
  const viewSegment = (mode, ico) =>
    Skeletons.Box.X({
      className: `${cnTopbar}__view-toggle-seg ${cnTopbar}__view-toggle-seg--${mode}`,
      // The glyphs must stay handler-less either way, so the click reaches
      // whichever ancestor owns the service (the segment here, the box for DMZ).
      kidsOpt: { active: 0 },
      ...(opt.namedState
        ? {
          service: "toggle-files-layout",
          value: mode,
          radio: `file-view-${ui._id}`,
          state: state === mode ? 1 : 0,
          bubble: false,
          uiHandler: [ui],
        }
        : {}),
      kids: [
        Skeletons.Image.Svg({
          ico: "account_check",
          className: `${cnTopbar}__view-toggle-check`,
          active: 0,
        }),
        Skeletons.Image.Svg({
          ico,
          className: `${cnTopbar}__view-toggle-glyph`,
          active: 0,
        }),
      ],
    });

  return Skeletons.Box.X({
    className: `${cnTopbar}__view-toggle`,
    service: "toggle-files-layout",
    sys_pn: "view-ctrl",
    dataset: {
      state,
      visible: 1,
    },
    uiHandler: [ui],
    // NO kidsOpt when the segments own the service: `active: 0` propagates down
    // and would leave them handler-less, so every press would bubble to the box
    // and cycle again — the exact bug this replaced. The two-mode DMZ control
    // still wants it, because there the box is the only handler.
    ...(opt.namedState ? {} : { kidsOpt: { active: 0 } }),
    kids: modes.map(({ mode, ico }) => viewSegment(mode, ico)),
  });
}

function fileNewControl(ui) {
  const cnTopbar = `${ui.fig.family}-topbar`;
  return Skeletons.Box.X({
    className: `${cnTopbar}__new-ctrl`,
    sys_pn: "new-ctrl",
    partHandler: ui,
    // Resolve write permission after mount; starting hidden prevents a flash
    // for viewers who cannot upload or create files.
    dataset: { visible: 0 },
    // The menu is registered as a part in its own right, not just wrapped: the
    // folder window listens for its `open` to trigger the migrate tour, and the
    // wrapper above cannot report that — it is a plain box, and the open state
    // lives on the menu widget. Named here rather than inside newMenu() so the
    // part belongs to the control that owns it.
    kids: [
      { ...newMenu(ui), sys_pn: "new-menu", partHandler: ui },
      // Mobile-only dim layer behind the centred card (the skin re-anchors the
      // panel to the viewport centre on small screens). Desktop never shows it.
      //
      // It has to be a real framework Box rather than a CSS ::before, because
      // ui-core's menu closes on outside click via RADIO_CLICK, and that channel
      // is only ever fired from View.prototype.triggerHandlers — i.e. by taps on
      // framework views. A pseudo-element would dim the screen and then swallow
      // every tap without closing anything, trapping the user in the menu.
      //
      // Deliberately a SIBLING *after* the menu, so the skin can reveal it with
      // `…__wrapper[data-state="1"] ~ &` — a plain sibling combinator keyed off
      // the state ui-core already writes, needing neither :has() nor a second
      // piece of state to keep in sync. Paint order is set by z-index, not by
      // this DOM order.
      Skeletons.Box.X({
        className: `${cnTopbar}__new-backdrop`,
        service: "close-new-menu",
        uiHandler: [ui],
      }),
    ],
  });
}

function fileFilterControls(ui) {
  const cnTopbar = `${ui.fig.family}-topbar`;
  return Skeletons.Box.X({
    className: `${cnTopbar}__file-controls`,
    kids: [
      fileNewControl(ui),
      fileViewToggle(ui, {
        namedState: true,
        modes: [
          { mode: "group", ico: "view-group" },
          { mode: "list", ico: "view-list" },
          { mode: "grid", ico: "view-grid" },
        ],
      }),
    ],
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
  // The folder window and the DMZ share grid use the same SVG tab glyphs
  // (Files / Chat / Tasks) — see the reference design. Other non-folder
  // windows keep their own monochrome SVG glyphs (the non-emoji branch below).
  const useEmojiTabs = isFolder || ui.fig.family === "dmz-sharebox";
  const folderTab = ({ ico, label, service, state, tab }) =>
    Skeletons.Box.X({
      className: `${cnRoot}-item ${ui.fig.family}__tab-bar-item`,
      service,
      state,
      dataset: { tab },
      uiHandler: [ui],
      kids: [
        // SVG glyph. `__tab-bar-icon` is pointer-events:none in the skin, so a
        // click on the icon still bubbles to the tab Box.X's own `service`.
        Skeletons.Button.Svg({
          className: `${ui.fig.family}__tab-bar-icon`,
          ico,
        }),
        Skeletons.Note({
          className: `${ui.fig.family}__tab-bar-label`,
          content: label,
        }),
      ],
    });

  let chat_tab = folderTab({
    ico: "meet-chat-dots",
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
  if (opt.chat === false || _dmzShareWithoutChat(ui)) {
    chat_label = "";
    chat_tab = "";
  }

  let task_tab = folderTab({
    ico: "app-task",
    label: LOCALE.TASK || "Tasks",
    service: "tab-task",
    state: 0,
    tab: _a.task,
  });
  let task_label = Skeletons.Button.Label({
    className: `${cnRoot}-item ${ui.fig.family}__tab-bar-item`,
    label: LOCALE.TASK,
    ico: "list",
    service: "tab-task",
    state: 0,
    dataset: { tab: _a.task },
    uiHandler: [ui],
  });

  // A shared link carries files (and optionally a conversation) — never a task
  // board, and the DMZ mounts no task panel: dmzSplitBody only ever builds the
  // files + conversation panels while the skin hides BOTH for data-view="task",
  // so the tab opened a blank body. Drop it in every share view, at every folder
  // depth. Desk/team/sharebox windows keep it (_inDmzShare is false there).
  if (_inDmzShare(ui)) {
    task_label = "";
    task_tab = "";
  }

  const kids = useEmojiTabs
    ? [
        folderTab({
          ico: "app-file",
          label: LOCALE.FILES,
          service: "tab-files",
          state: 1,
          tab: "files",
        }),
        chat_tab,
        task_tab,
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
        task_label,
      ];

  if (opt.meeting) {
    // Emoji-tab windows use folderTab so Meeting matches Files/Chat/Tasks.
    kids.push(
      useEmojiTabs
        ? folderTab({
            ico: "folder-meeting",
            label: LOCALE.MEETING,
            service: "tab-meeting",
            state: 0,
            tab: "meeting",
          })
        : Skeletons.Button.Label({
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

  // NOTE: the Task-tab member-filter trigger used to live here on the window
  // tab bar. It now lives in the task panel's own secondary header (viewbar)
  // per Figma 2040-53814, so it's rendered by the task skeleton instead. The
  // folder window's toggle-task-filter / task-filter-state handlers remain but
  // are simply no longer wired to a button here.

  // The folder's New + layout controls now live in its file filter row. Keep
  // the shared DMZ layout toggle here because DMZ does not render that row.
  const splitBtn =
    !isFolder && ui.fig.family === "dmz-sharebox"
      ? fileViewToggle(ui)
      : "";

  // The strip is the scroller for the mobile carousel (folder skin's
  // @container block pages it two tabs at a time), so it needs to be reachable
  // from JS — the scroll listener that tracks the current page lives in
  // folder/index.js onPartReady("tab-bar-tabs").
  const tabStrip = Skeletons.Box.X({
    className: `${cnRoot}-tabs ${ui.fig.family}__tab-bar-tabs`,
    sys_pn: "tab-bar-tabs",
    partHandler: ui,
    kids,
  });

  // Carousel footer: one dot per page of two tabs, so a phone user can see that
  // the strip continues past the two visible tabs. Built HERE rather than at
  // runtime because the tab count is already settled at this point — Chat and
  // Task have been dropped for DMZ shares above, and Meeting was pushed or not.
  // `kids` carries "" for each dropped tab, hence the filter.
  //
  // Folder only. The container query that reveals these is window-folder-w, and
  // the other families that share this tab bar would each need their own skin
  // work and their own onPartReady hook — so they render no dots at all rather
  // than dead markup.
  //
  // One page means nothing to page through: data-visible=0 hides the footer, the
  // same convention __new-ctrl uses.
  const tabPages = Math.ceil(kids.filter(Boolean).length / 2);
  const tabDots = isFolder
    ? Skeletons.Box.X({
        className: `${cnRoot}-dots ${ui.fig.family}__tab-bar-dots`,
        sys_pn: "tab-bar-dots",
        partHandler: ui,
        // `page` is the only state this footer has. The scroll listener writes
        // it and the skin maps it to the active dot, so nothing per-dot has to
        // be touched as the strip moves.
        dataset: { page: 0, visible: tabPages > 1 ? 1 : 0 },
        kids: Array.from({ length: tabPages }, (_, i) =>
          Skeletons.Box.X({
            className: `${cnRoot}-dot ${ui.fig.family}__tab-bar-dot`,
            service: "tab-bar-page",
            dataset: { page: i },
            uiHandler: [ui],
          }),
        ),
      })
    : "";

  return Skeletons.Box.X({
    className: `${cnRoot}-wrapper ${ui.fig.family}__tab-bar-wrapper`,
    dataset: isFolder ? { area: ui.mget(_a.area) } : {},
    kids: [tabStrip, splitBtn, tabDots],
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
  // A scheduled meeting is stored as an MFS node (room.book → category
  // 'schedule') in the workspace home dir, so it lands in this listing with no
  // content and no viewer — rows that can't be opened. Never list them, not
  // even under showHidden, which is about dotfiles.
  // mfs_show_node_by aliases the column as `m.category AS ftype`; other list
  // sources pass it through unaliased, so both keys are checked.
  const skip = { ftype: "schedule", category: "schedule" };
  if (!localStorage.getItem("showHidden")) skip.filename = /^\./;
  const list = Skeletons.List.Smart({
    className: `${pfx}__icons-list`,
    innerClass: `${pfx}__icons-scroll`,
    sys_pn: _a.list,
    flow: _a.none,
    timer: 2000,
    dataset: {
      role: _a.container,
    },
    // The listing this drives (media.show_node_by) takes ~800ms of server time
    // on a real workspace, so a 1500ms arming delay meant the grid sat blank
    // with no feedback at all for the entire wait and the spinner only ever
    // appeared on the slowest folders — measured: first paint at 1747ms, first
    // spinner at 1272ms. Arm it early enough to actually cover the wait; it is
    // still late enough that a cached/instant listing never flashes one.
    spinnerWait: 250,
    spinner: true,
    itemsOpt: opt,
    skip,
    vendorOpt: Preset.List.Orange_e,
    api: function (x) {
      return ui.getCurrentApi();
    },
  });

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
                // NOT admin-only: chat opens at the "View & chat" tier, so the
                // old ADMIN wording named the wrong role to ask for.
                content: LOCALE.CHAT_PERMISSION_REQUIRED,
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
  const filterTabs = tabs.map((tab, index) =>
    button(ui, {
      label: tab.label,
      className: `${ui.fig.family}__filter-tab`,
      service: "filter-by-type",
      state: index === 0 ? 1 : 0,
      radiotoggle: `media-filter-${ui._id}`,
      value: tab.value,
      dataset: { area: ui.mget(_a.area) },
    }),
  );
  return Skeletons.Box.X({
    className: `${ui.fig.family}__filter-bar`,
    sys_pn: "file-type-filter",
    partHandler: ui,
    dataset: { area: ui.mget(_a.area) },
    kids: [...filterTabs, fileFilterControls(ui)],
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
    // Row/list view must carry the same file-type filter bar (All/Docs/PDF/
    // Images/Other) as the grid view (see filesContainer) — it was missing in
    // list mode. The filter is view-agnostic: clicking a tab sets _filterType
    // and loadContent() re-fetches via getCurrentApi(), which the row list's
    // `() => ui.getCurrentApi()` api already honors. content/row supplies the
    // column-title header + list below the bar.
    kids: [fileTypeFilterBar(ui), require("../content/row")(ui)],
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
          // Says where the file went once it has left this workspace. Stays
          // empty — and so renders nothing — for a file that is still here,
          // which is every ordinary thread.
          Skeletons.Note({ className: `${grp}__ft-info-status`, content: "" }),
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
    //
    // chat_gated mirrors chatPanel's: this panel hosts its own chat widget, so
    // a view-only member must meet a blurred composer here too. Seeded at build
    // time so there is no flash of a live composer before _syncChatGate runs.
    dataset: {
      open: 0,
      area: ui.mget(_a.area),
      chat_gated: Number(ui.mget(_a.privilege)) & _K.permission.download ? 0 : 1,
    },
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
  if (_dmzShareWithoutChat(ui)) return [files];
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
 * Merged "+ New" menu for the folder window Files tab (replaces the separate
 * header Upload + Add-new buttons). The outer `menu_topic` owns import actions
 * and a plain nested Box flyout owns create actions. Keeping one menu widget
 * preserves its outside-click lifecycle while matching the cascading menu used
 * elsewhere in the app.
 *
 * Kept separate from `newFileMenu` (still used by team/sharebox/dmz windows) so
 * those callers are untouched.
 *
 * @param {*} ui folder window
 * @param {{ triggerIco?: string }} opt
 */
export function newMenu(ui, opt = {}) {
  const cnWindowButton = `${ui.fig.group}-button`;
  const cnDropdown = `${cnWindowButton}__dropdown-menu`;
  const cnItem = `${cnDropdown}__item`;

  // Build one menu row (icon + label) that carries a `service`. Mirrors the row
  // shape used by dropdownMenuButton: active:0 on the row's kids so a click on
  // the icon/label bubbles to the row (which owns the service) rather than being
  // swallowed by the interactive Button.Svg / Note.
  const row = ({ service, ico, content, area, name, className }) =>
    Skeletons.Box.X({
      className: className ? `${cnItem} ${className}` : cnItem,
      uiHandler: [ui],
      service,
      // `name` rides along so new-document rows carry their filename
      // (document.docx / spreadsheet.xlsx / presentation.pptx) — newDocument()
      // reads cmd.mget(_a.name).
      name,
      kidsOpt: { active: 0 },
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
    });

  const importRows = [
    row({
      service: _e.upload,
      ico: "app-upload",
      content: LOCALE.FROM_DEVICE,
      className: `${cnItem}--from-device`,
    }),
    row({
      service: "launch-gdrive-migration",
      ico: "logo-google",
      content: LOCALE.MIGRATE_GDRIVE_TITLE,
      className: `${cnItem}--gdrive`,
    }),
  ];

  // Create rows keep the historical folder services and filenames. Only their
  // presentation moves into the right-side flyout.
  const createRows = [
    row({
      service: "add-folder",
      ico: "addmenu-folder",
      content: LOCALE.FOLDER,
      area: ui.mget(_a.area) || _a.personal,
      className: `${cnItem}--add-folder ${cnDropdown}__submenu-item`,
    }),
    // Note is temporarily hidden from this create flyout (2026-08). The
    // add-note handler (window/core.js) and editor_markdown stay wired —
    // uncomment this row to restore the option.
    // row({
    //   service: "add-note",
    //   ico: "addmenu-note",
    //   content: LOCALE.NOTE,
    //   className: `${cnItem}--add-note ${cnDropdown}__submenu-item`,
    // }),
    row({
      service: "new-document",
      name: "document.docx",
      ico: "addmenu-document",
      content: LOCALE.DOCUMENT,
      className: `${cnItem}--document ${cnDropdown}__submenu-item`,
    }),
    row({
      service: "new-document",
      name: "spreadsheet.xlsx",
      ico: "addmenu-spreadsheet",
      content: LOCALE.SPREADSHEET,
      className: `${cnItem}--spreadsheet ${cnDropdown}__submenu-item`,
    }),
    row({
      service: "new-document",
      name: "presentation.pptx",
      ico: "addmenu-presentation",
      content: LOCALE.PRESENTATION,
      className: `${cnItem}--presentation ${cnDropdown}__submenu-item`,
    }),
  ];

  const createGroup = Skeletons.Box.X({
    className: `${cnItem} ${cnItem}--create-group`,
    sys_pn: "new-create-group",
    partHandler: ui,
    uiHandler: [ui],
    service: "toggle-new-create-menu",
    dataset: { submenu: _a.closed },
    kidsOpt: { active: 0 },
    kids: [
      Skeletons.Note({
        content: "+",
        active: 0,
        className: `${cnDropdown}__create-symbol`,
      }),
      Skeletons.Note({
        content: LOCALE.ADD_NEW,
        active: 0,
        className: `${cnDropdown}__name`,
      }),
      Skeletons.Box.Y({
        active: 0,
        className: `${cnDropdown}__create-submenu`,
        kids: createRows,
      }),
    ],
  });

  const items = Skeletons.Box.Y({
    className: `${cnDropdown}__items`,
    kids: [...importRows, createGroup],
  });

  // Use the same dedicated add glyph as the desk topbar so the plus has stable
  // proportions and weight independent of the translated label's font.
  const trigger = Skeletons.Button.Label({
    ico: "topbar-add",
    className: `${cnWindowButton}__label-button primary`,
    label: LOCALE.NEW,
    uiHandler: ui,
    partHandler: ui,
  });

  return {
    kind: KIND.menu.topic,
    className: `${cnDropdown}__wrapper`,
    flow: _a.y,
    opening: _e.click,
    // The parent row must be clickable without dismissing the outer panel.
    // Folder leaf handlers close the ancestor menu explicitly.
    persistence: _a.always,
    callback: () => {
      const group = ui.getPart && ui.getPart("new-create-group");
      if (group && group.el) group.el.dataset.submenu = _a.closed;
    },
    trigger,
    items,
  };
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
 * "Move & Resize" — the window's snap control.
 *
 * Deliberately the same control the players already show in their topbar
 * (player/widget/topbar/skeleton/move-resize): hovering the expand icon
 * reveals a panel of window presets, each emitting one of the four snap
 * services every window answers through builtins/window/snap. A workspace
 * window and a document viewer therefore offer window management with the
 * same glyph, the same panel and the same vocabulary.
 *
 * This replaced a macOS green-traffic-light imitation, which looked native
 * to macOS and foreign to everything else in the app.
 *
 * The four preset glyphs are drawn in CSS (outline box + inner block), as
 * in the Figma, which builds them from plain shapes rather than an icon.
 * `data-preset` selects the glyph; `data-active` marks the layout the
 * window is currently in and is stamped live by the window itself — the
 * active preset is inert (see the skin), so it has to follow reality.
 *
 * @param {*} ui
 */
export function zoomMenu(ui) {
  const cnRoot = `${ui.fig.family}-topbar__zoom`;

  const presets = [
    { preset: "full", service: "window-zoom" },
    { preset: "left", service: "window-tile-left" },
    { preset: "right", service: "window-tile-right" },
    { preset: "center", service: "window-reframe" },
  ];

  return Skeletons.Box.X({
    className: `${cnRoot}-wrapper`,
    kids: [
      // No service: the trigger only reveals the panel. Maximising is the
      // "full" preset inside it, so there is exactly one way to do it.
      Skeletons.Button.Svg({
        ico: "desktop_fullview",
        className: `${cnRoot}-trigger`,
        sys_pn: "zoom-trigger",
        partHandler: ui,
      }),
      Skeletons.Box.Y({
        className: `${cnRoot}-menu`,
        kids: [
          Skeletons.Note({
            content: LOCALE.MOVE_RESIZE,
            active: 0,
            className: `${cnRoot}-label`,
          }),
          Skeletons.Box.X({
            className: `${cnRoot}-presets`,
            sys_pn: "zoom-presets",
            partHandler: ui,
            kids: presets.map(({ preset, service }) =>
              Skeletons.Box.X({
                className: `${cnRoot}-preset`,
                service,
                uiHandler: [ui],
                dataset: { preset, active: 0 },
                // The glyph is pure CSS: this Box is the outline, its kid
                // the inner block whose width/position the skin varies by
                // `data-preset`.
                //
                // `active: 0` must be set on EACH kid, not via the parent's
                // `kidsOpt` — ui-core's mergeKidsOptions rebinds its local
                // `item` and never writes back, so kidsOpt reaches nothing.
                // An active kid binds its own onclick, and ui-core's
                // __handleClick calls stopPropagation() BEFORE it discovers
                // it has no uiHandler — so the glyph swallowed the click and
                // the preset's service never ran. Only the second click of a
                // double-click got through (the 300ms suppressor returns
                // before stopPropagation). Mirrors topbarMoreMenu's items.
                kids: [
                  Skeletons.Box.X({
                    className: `${cnRoot}-glyph`,
                    active: 0,
                    kids: [
                      Skeletons.Element({
                        className: `${cnRoot}-glyph-fill`,
                        active: 0,
                      }),
                    ],
                  }),
                ],
              }),
            ),
          }),
        ],
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
  // Meeting now lives as a permanent tab (not an overflow item). Manage Access /
  // Settings still collapse here.
  // Manage Access mirrors the share control-icon: share areas + workspace ROOT
  // only (filetype === hub). Sub-folders already share via their right-click
  // "Share" menu, so this entry is redundant there — keep in sync with topbar.js.
  const isRoot = ui.mget(_a.filetype) === _a.hub && ui.mget(_a.actual_home_id);
  // Same write gate as the inline share icon in folder/skeleton/topbar.js: a
  // secure-share link can grant can_edit, so a view/chat member must not be able
  // to mint one for a workspace they only read. Keep the two in sync.
  const mayManageAccess =
    typeof ui.canUpload !== "function" ? true : !!ui.canUpload();
  if (!inShare && area === _a.share && isRoot && mayManageAccess) {
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
