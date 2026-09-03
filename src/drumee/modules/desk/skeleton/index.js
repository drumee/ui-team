// The phone's top bar — the 2.0 shell reduced to one row.
//
// 43:23955 gives the desktop three zones: the rail (the WORKSPACE's own
// actions), the topbar's left half (identity + location) and its right half
// (global destinations + account). A 375px row can hold one of those, so the
// zones are split by what already carries them elsewhere:
//
//   workspace actions   the pane's own tab carousel (Files/Chat/Task/Meet),
//                       restored for mobile in window/folder/skeleton
//   global destinations the drawer, behind the hamburger
//   identity           HERE, because nothing else on a phone shows it
//
// What this replaces spent its entire left half on a 101px Drumee wordmark
// and showed no workspace name at all, so there was no way to tell which
// workspace you were in — the one thing the desktop bar never stops saying.
//
// The wordmark goes. On a phone the app's identity is the app icon on the home
// screen; the screen's identity is the workspace you are standing in.
// The phone's top bar — the approved Option A (design canvas
// "Drumee 2.0 Mobile Shell").
//
// The desktop shell distributes its chrome across three surfaces: the org-tab
// dropdown (switch workspace), the utility cluster (global destinations) and
// the avatar menu (account). This bar is those three, one control each:
//
//   workspace pill  -> the switcher sheet     (mobile-workspace-sheet)
//   bell            -> notifications          (toggle-activity, count badge)
//   go-to grid      -> the destinations sheet (mobile-goto-sheet)
//   avatar          -> the account sheet      (mobile-account-sheet)
//
// No hamburger and no drawer: the legacy drawer's content maps 1:1 onto the
// sheets, so the drawer itself is gone. No wordmark either — on a phone the
// app's identity is the home-screen icon; the screen's identity is the
// workspace you are standing in, which is what the pill never stops saying.
const _build_mobile_topbar = (ui) => {
  const fig = ui.fig.family;

  const chip = (opt) =>
    Skeletons.Box.X({
      className: `${fig}__mobile-topbar-btn ${opt.mod || ""}`,
      service: opt.service,
      uiHandler: [ui],
      sys_pn: opt.pn,
      // ui-core binds a click to every widget that does not opt out and stops
      // propagation before triggerHandlers, so a child would eat this.
      kidsOpt: { active: 0 },
      kids: opt.kids,
    });

  return Skeletons.Box.X({
    className: `${fig}__mobile-topbar`,
    sys_pn: "mobile-topbar",
    kids: [
      // Identity. Mirrors the desktop org-tab: the area-tinted folder shape,
      // the name at 14/600, a caret saying it opens something. `ws-current` is
      // the part _setWorkspaceLabel already writes, so the name tracks every
      // switch with no new wiring.
      Skeletons.Box.X({
        className: `${fig}__mobile-workspace`,
        service: "mobile-workspace-sheet",
        uiHandler: [ui],
        kidsOpt: { active: 0 },
        kids: [
          Skeletons.Element({
            className: `${fig}__mobile-workspace-ico`,
            content: require("media/grid/template/folder")({
              area: ui.mget(_a.area),
              filetype: _a.hub,
              role: "desk",
              widgetId: _.uniqueId("m-ws-"),
              isAttachment: 1,
            }),
          }),
          Skeletons.Note({
            className: `${fig}__mobile-workspace-name`,
            sys_pn: "ws-current",
            partHandler: ui,
            content: LOCALE.WORKSPACES,
          }),
          Skeletons.Image.Svg({
            ico: "ph-caret-down",
            className: `${fig}__mobile-workspace-caret`,
          }),
        ],
      }),

      Skeletons.Box.X({
        className: `${fig}__mobile-topbar-wrapper`,
        kids: [
          chip({
            service: "toggle-activity",
            pn: "mobile-bell-btn",
            mod: "bell",
            kids: [
              Skeletons.Image.Svg({ ico: "sidebar_notifications", className: `${fig}__mobile-topbar-ico` }),
              // Its OWN part name — registerPart is last-one-wins, and both
              // 'activity-count' (the old drawer) and 'activity-count-top'
              // (the desktop cluster, still rendered on mobile) are taken.
              Skeletons.Note({
                className: `${fig}__mobile-topbar-count`,
                sys_pn: "activity-count-mobile",
                partHandler: ui,
                content: "",
              }),
            ],
          }),
          chip({
            service: "mobile-goto-sheet",
            pn: "mobile-goto-btn",
            mod: "goto",
            kids: [Skeletons.Image.Svg({ ico: "dots-nine", className: `${fig}__mobile-topbar-ico` })],
          }),
          Skeletons.Box.X({
            className: `${fig}__mobile-topbar-avatar`,
            service: "mobile-account-sheet",
            uiHandler: [ui],
            sys_pn: "mobile-avatar-btn",
            kidsOpt: { active: 0 },
            kids: [
              Skeletons.UserProfile({
                className: `${fig}__mobile-topbar-avatar-img`,
                id: Visitor.id,
                firstname: Visitor.firstname ? Visitor.firstname() : "",
                lastname: Visitor.lastname ? Visitor.lastname() : "",
                auto_color: 1,
                oneLetter: 1,
                live_status: 0,
                active: 0,
              }),
            ],
          }),
        ],
      }),
    ],
  });
};

// The Files action row — search + "+ New", between the bar and the content
// (the approved canvas draws it on the Files screen). Stamped in and out by
// data-mtab on __main: the desk writes the active rail tab there, and CSS
// hides this row for every tab but files — Chat has its composer and Task its
// own "+ New", so the row would only duplicate them.
const _build_mobile_action_row = (ui) => {
  const fig = ui.fig.family;
  return Skeletons.Box.X({
    className: `${fig}__mobile-actions`,
    sys_pn: "mobile-actions",
    kids: [
      Skeletons.Box.X({
        className: `${fig}__mobile-search-pill`,
        service: "open-mobile-search",
        uiHandler: [ui],
        kidsOpt: { active: 0 },
        kids: [
          Skeletons.Image.Svg({ ico: "magnifying-glass", className: `${fig}__mobile-search-ico` }),
          Skeletons.Note({
            className: `${fig}__mobile-search-hint`,
            content: LOCALE.SEARCH,
          }),
        ],
      }),
      // Over-limit: creating, uploading and inviting are all paused, exactly
      // as the tablet consolidated menu goes empty — so the button that opens
      // the create sheet is not offered at all. "" is dropped by validChild.
      require("libs/over-limit").isLocked() ? "" : Skeletons.Box.X({
        className: `${fig}__mobile-new-btn`,
        service: "mobile-new-sheet",
        uiHandler: [ui],
        kidsOpt: { active: 0 },
        kids: [
          Skeletons.Note({ className: `${fig}__mobile-new-plus`, content: "+" }),
          Skeletons.Note({ className: `${fig}__mobile-new-label`, content: LOCALE.NEW }),
        ],
      }),
    ],
  });
};

// The sheet host: a dim that closes on tap, and the sheet panel the desk
// feeds per kind (_openMobileSheet). One host for all four sheets — only one
// is ever open, and feed() replaces the content wholesale.
const _build_mobile_sheet_host = (ui) => {
  const fig = ui.fig.family;
  return Skeletons.Box.Y({
    className: `${fig}__msheet-host`,
    sys_pn: "mobile-sheet-host",
    partHandler: ui,
    attrOpt: { "data-state": "closed" },
    kids: [
      Skeletons.Box.X({
        className: `${fig}__msheet-dim`,
        service: "mobile-sheet-close",
        uiHandler: [ui],
      }),
      Skeletons.Box.Y({
        className: `${fig}__msheet`,
        kidsOpt: { active: 0 },
        kids: [
          Skeletons.Box.X({ className: `${fig}__msheet-grabber` }),
          Skeletons.Box.Y({
            className: `${fig}__msheet-content`,
            sys_pn: "mobile-sheet-content",
            partHandler: ui,
          }),
        ],
      }),
    ],
  });
};

// The phone's workspace navigation — the 2.0 rail, translated.
//
// On desktop the rail IS the workspace's navigation: always visible, five
// destinations, one click each (43:23955). The obvious ports both fail:
// putting those five in the drawer costs a menu trip per view change, and
// leaving them to the pane's tab strip hands a phone the pre-2.0 window
// carousel — two tabs at a time behind dots.
//
// A bottom bar is the same object in the shape a phone reads: persistent,
// thumb-reachable, one tap per destination. It carries the SAME services as
// the rail, so _railTab / _railAccess drive it with no new wiring, and it
// wears the rail's own treatment — navy ground, a 40px r=8 tile that fills
// with --primary-40 when active, the label under the glyph.
//
// It has its OWN radio group. Sharing the rail's "sidebar-radio" would let a
// drawer row and a bar item mark each other, since the drawer is rendered at
// the same time.
const _build_mobile_rail = (ui) => {
  const fig = ui.fig.family;

  const item = ({ ico, label, service, pn }) =>
    Skeletons.Box.Y({
      className: `${fig}__mrail-item`,
      service,
      uiHandler: [ui],
      radio: "mobile-rail-radio",
      sys_pn: pn,
      // ui-core binds a click to every widget that does not opt out and stops
      // propagation before triggerHandlers, so a glyph or label would eat it.
      kidsOpt: { active: 0 },
      kids: [
        Skeletons.Box.X({
          className: `${fig}__mrail-tile`,
          kidsOpt: { active: 0 },
          kids: [
            Skeletons.Image.Svg({ ico, className: `${fig}__mrail-glyph` }),
          ],
        }),
        Skeletons.Note({ className: `${fig}__mrail-label`, content: label }),
      ],
    });

  return Skeletons.Box.X({
    className: `${fig}__mrail`,
    sys_pn: "mobile-rail",
    partHandler: ui,
    kids: [
      item({ ico: "rail-files", label: LOCALE.FILES, service: "rail-files", pn: "mrail-files" }),
      item({ ico: "rail-chat", label: LOCALE.CHAT, service: "rail-chat", pn: "mrail-chat" }),
      item({ ico: "rail-task", label: LOCALE.TASK, service: "rail-task", pn: "mrail-task" }),
      item({ ico: "rail-meet", label: LOCALE.MEET, service: "rail-meet", pn: "mrail-meet" }),
      item({ ico: "rail-access", label: LOCALE.ACCESS, service: "rail-access", pn: "mrail-access" }),
    ],
  });
};

// Mobile search card, and the desk's ONLY search field: this is the global,
// cross-workspace search (desk.search — every hub the user owns, plus chat
// messages, and the list of workspaces for an empty query). Desktop has no
// counterpart any more; the workspace toolbar's field there searches ONE
// workspace's files and is owned by the folder window (window/skeleton/toolkit
// workspaceSearchBox).
//
// It keeps the desk's part names ("search-box", "search-suggestions",
// "suggestions-list") because every handler in desk/index.js (the 300ms
// debounce, _updateSearchSuggestions, the personal-hub filter on the list,
// open-search-hit) drives it through them with no branching. Nothing else
// claims those names now, so the "exactly one mounted" rule holds by
// construction rather than by the desktop topbar being display:none.
//
// Mounted at state 0 on every mobile desk rather than lazily, so ensurePart()
// resolves immediately on the first tap instead of racing a mount.
const _build_mobile_search_card = (ui) => {
  const fig = ui.fig.family;

  return Skeletons.Box.Y({
    className: `${fig}__mobile-search`,
    sys_pn: "mobile-search-card",
    partHandler: ui,
    state: 0,
    kids: [
      Skeletons.Box.X({
        className: `${fig}__mobile-search-bar`,
        kids: [
          Skeletons.Image.Svg({
            ico: "magnifying-glass",
            className: `${fig}__mobile-search-icon`,
          }),
          Skeletons.Entry({
            className: `${fig}__mobile-search-input`,
            sys_pn: "search-box",
            uiHandler: [ui],
            partHandler: ui,
            placeholder: LOCALE.SEARCH || "Search...",
            service: "search-files",
            type: _a.text,
            autocomplete: _a.off,
            interactive: 1,
          }),
          Skeletons.Button.Svg({
            ico: "cross",
            className: `${fig}__mobile-search-close`,
            service: "close-mobile-search",
            uiHandler: [ui],
          }),
        ],
      }),

      Skeletons.Box.Y({
        className: `${fig}__mobile-search-suggestions`,
        sys_pn: "search-suggestions",
        partHandler: ui,
        state: 0,
        kids: [
          Skeletons.List.Smart({
            className: `${fig}__mobile-search-list`,
            sys_pn: "suggestions-list",
            partHandler: ui,
            flow: _a.none,
            spinner: true,
            spinnerWait: 300,
            vendorOpt: Preset.List.Orange_e,
            itemsOpt: {
              kind: "workspace_item",
              uiHandler: [ui],
              // Same reveal-in-context path as the desktop suggestions —
              // desk/index.js onUiEvent → "open-search-hit".
              service: "open-search-hit",
            },
          }),
        ],
      }),
    ],
  });
};

const _desk_main = function (ui) {
  const isMobile = Visitor.isMobile();

  const bodyKids = [
    // Desktop only: the rail. The phone has no drawer any more — the approved
    // Option A replaces it with the bottom rail and the three sheets, all
    // mounted below. "" is dropped by ui-core's validChild.
    isMobile ? "" : require("./sidebar")(ui),
    // Left container. Trash and notifications used to live here and slid
    // out from the sidebar edge while inbox/contacts came in from the
    // right — the two halves of the sidebar disagreed, and switching
    // quickly between them sent panels flying past each other. All four
    // now share the right container below. Only the (inert) settings-panel
    // slot is left here.
    Skeletons.Box.Y({
      sys_pn: "panel",
      className: `${ui.fig.family}__panel-container left`,
      kids: [
        Skeletons.Box.Y({
          sys_pn: "settings-panel",
          className: `${ui.fig.family}__panel-inner`,
        }),
      ],
    }),
    Skeletons.Box.Y({
      sys_pn: "desk-body",
      className: `${ui.fig.family}__right-side`,
      kids: [
        Skeletons.Box.Y({
          sys_pn: "top-bar",
          className: `${ui.fig.family}__topbar`,
          kids: [require("./topbar")(ui)],
        }),
        Skeletons.Box.X({
          sys_pn: "desk-wrapper",
          className: `${ui.fig.family}__wm-container`,
          kids: [
            {
              kind: "window_manager",
              sys_pn: "desk-content",
            },
            Skeletons.Box.Y({
              sys_pn: "settings-main-slot",
              className: `${ui.fig.family}__settings-main-slot`,
            }),
            // Host for the no-workspace screen (desk/home-empty), fed by
            // _openWorkspaceOrEmptyScreen when no workspace exists.
            //
            // A SIBLING of window_manager rather than something inside it: the
            // WM owns the window pools, and the state this covers is precisely
            // "there is no window to show". Feeding it here also means the WM
            // never has to be torn down and rebuilt to leave the state.
            Skeletons.Box.Y({
              sys_pn: "home-empty-slot",
              className: `${ui.fig.family}__home-empty-slot`,
            }),
          ],
        }),
      ],
    }),
    // Right container — every sidebar slide-out. The container is no longer
    // the chat slot itself: togglePanel clears the slot it feeds, so static
    // siblings could not live inside it. Each panel gets its own zero-width
    // __panel-inner anchor instead, and all three park off the right edge.
    Skeletons.Box.Y({
      className: `${ui.fig.family}__panel-container right`,
      kids: [
        Skeletons.Box.Y({
          sys_pn: "chat-panel",
          className: `${ui.fig.family}__panel-inner`,
        }),
        Skeletons.Box.Y({
          sys_pn: "trash-panel",
          className: `${ui.fig.family}__panel-inner`,
        }),
        Skeletons.Box.Y({
          className: `${ui.fig.family}__panel-inner`,
          kids: [
            {
              kind: "panel_activity",
              sys_pn: "activity-panel",
              state: 0,
              uiHandler: [ui],
            },
          ],
        }),
      ],
    }),
    // Host for a parked live call. The call WINDOW itself is moved in here
    // (window/meeting setCallTile) rather than being represented by a proxy,
    // because it is the only way to get it out of the window manager's stacking
    // context: `.window-manager__ui` carries `isolation: isolate` (wm/skin), so
    // no z-index on a window layer can clear the desk's own screens — the
    // full-page slot (Settings / Billing / Admin Console / Get help) or the
    // slide-out panels (Inbox / Contacts / Trash). Docked here the call sits
    // above all of them, which is what makes it ONE affordance that behaves the
    // same everywhere instead of a tile on some screens and a pill on others.
    //
    // Bare container on purpose: no service and no kids. The hosted window
    // brings its own "Return to call" cover, and the dock hides itself
    // (`:empty`) whenever no call is parked in it.
    Skeletons.Box.X({
      sys_pn: "call-dock",
      className: `${ui.fig.family}__call-dock`,
    }),
    Skeletons.Wrapper.Y({
      sys_pn: "overlay",
      className: `${ui.fig.family}__overlay`,
      // On mobile the overlay doubles as the tap-to-close backdrop for
      // the sidebar drawer. Service routing is wired at construction
      // so the very first tap fires (no async listener binding race).
      ...(isMobile ? { uiHandler: [ui], service: "mobile-close-drawer" } : {}),
    }),
  ];

  // After the overlay, so the card sits later in DOM order as well as above it
  // by z-index (skin/mobile-search.scss).
  if (isMobile) {
    bodyKids.push(_build_mobile_search_card(ui));
  }

  const mainKids = [
    Skeletons.Box.X({
      className: `${ui.fig.family}__body`,
      kids: bodyKids,
    }),
  ];

  if (isMobile) {
    mainKids.unshift(_build_mobile_action_row(ui));
    mainKids.unshift(_build_mobile_topbar(ui));
    // After __body, so it sits at the bottom of the column. Fixed positioning
    // takes it out of flow; __body reserves the space with padding-bottom so
    // content can still scroll clear of it.
    mainKids.push(_build_mobile_rail(ui));
    mainKids.push(_build_mobile_sheet_host(ui));
  }

  return Skeletons.Box.Y({
    className: `${ui.fig.family}__main`,
    debug: __filename,
    sys_pn: "main",
    dataset: {
      wallpaper: ui._wallpaper,
    },
    kids: mainKids,
  });
};

module.exports = _desk_main;
