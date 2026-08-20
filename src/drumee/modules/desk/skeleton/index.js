const _build_mobile_topbar = (ui) => {
  const fig = ui.fig.family;

  return Skeletons.Box.X({
    className: `${fig}__mobile-topbar`,
    sys_pn: "mobile-topbar",
    kids: [
      Skeletons.Box.X({
        className: `${fig}__mobile-topbar-logo`,
        kids: [
          Skeletons.Image.Svg({
            ico: "raw-logo-drumee-full",
            className: `${fig}__mobile-topbar-logo-icon`,
          }),
        ],
      }),
      Skeletons.Box.X({
        className: `${fig}__mobile-topbar-wrapper`,
        kids: [
          Skeletons.Button.Svg({
            ico: "add",
            className: `${fig}__mobile-topbar-btn add`,
            service: "mobile-show-add",
            uiHandler: [ui],
            sys_pn: "mobile-add-btn",
          }),
          Skeletons.Button.Svg({
            ico: "bars",
            className: `${fig}__mobile-topbar-btn menu`,
            service: "mobile-show-menu",
            uiHandler: [ui],
            sys_pn: "mobile-menu-btn",
          }),
        ],
      }),
    ],
  });
};

// Mobile search card. The desktop topbar — and with it the search cluster —
// is display:none at mobile widths, so search gets its own centered card here.
//
// It deliberately reuses the topbar's part names ("search-box",
// "search-suggestions", "suggestions-list") rather than declaring its own:
// every handler in desk/index.js (the 300ms debounce, _updateSearchSuggestions,
// the personal-hub filter on the list, open-search-hit) then drives this card
// with no branching. skeleton/topbar.js drops its own cluster on mobile so
// only one node ever claims each name.
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
    require("./sidebar")(ui),
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
    mainKids.unshift(_build_mobile_topbar(ui));
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
