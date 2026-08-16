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
    Skeletons.Box.Y({
      sys_pn: "panel",
      className: `${ui.fig.family}__panel-container left`,
      kids: [
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
    Skeletons.Box.Y({
      sys_pn: "chat-panel",
      className: `${ui.fig.family}__panel-container right`,
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
