// View toolbar: ‹ Today › + range label on the left; view dropdown, All/Task/
// Meet filter and "+ New" on the right. Figma 43:31159.
//
// The range label is a control, not a caption — 43:31159 draws it with a caret,
// which opens a month jump list for the cursor's year (year stepped from the
// list's own header). Dropdown mechanics are shared with the view and New menus.
const { VIEWS, FILTERS, rangeLabel, day } = require("./helpers");

module.exports = function (ui) {
  const pfx = ui.fig.family;
  const view = ui.getView();
  const filter = ui.getActiveFilter();

  // ── ‹ Today › ──────────────────────────────────────────────────────────────
  const nav = Skeletons.Box.X({
    className: `${pfx}__nav`,
    kids: [
      Skeletons.Button.Svg({
        className: `${pfx}__nav-arrow`,
        ico: "caret-left",
        bubble: 0,
        service: "cal-prev",
        uiHandler: [ui],
        attrOpt: { "aria-label": LOCALE.PREVIOUS },
      }),
      Skeletons.Note({
        className: `${pfx}__nav-today`,
        content: LOCALE.TODAY,
        bubble: 0,
        service: "cal-today",
        uiHandler: [ui],
      }),
      Skeletons.Button.Svg({
        className: `${pfx}__nav-arrow`,
        ico: "caret-right",
        bubble: 0,
        service: "cal-next",
        uiHandler: [ui],
        attrOpt: { "aria-label": LOCALE.NEXT },
      }),
    ],
  });

  // ── range label + month jump ───────────────────────────────────────────────
  const cursor = day(ui.getCursor()) || Dayjs();
  const cursorMonth = cursor.month();
  const cursorYear = cursor.year();

  const rangeMenu = ui.isRangeMenuOpen()
    ? Skeletons.Box.Y({
        className: `${pfx}__menu ${pfx}__range-menu`,
        attrOpt: { "data-anchor": "range" },
        kids: [
          // Year stepper. Stays open across a step so the user can browse.
          Skeletons.Box.X({
            className: `${pfx}__range-year`,
            kids: [
              Skeletons.Button.Svg({
                className: `${pfx}__nav-arrow`,
                ico: "caret-left",
                bubble: 0,
                service: "cal-set-year",
                uiHandler: [ui],
                calYear: -1,
                attrOpt: { "aria-label": LOCALE.PREVIOUS },
              }),
              Skeletons.Note({
                className: `${pfx}__range-year-label`,
                content: String(cursorYear),
              }),
              Skeletons.Button.Svg({
                className: `${pfx}__nav-arrow`,
                ico: "caret-right",
                bubble: 0,
                service: "cal-set-year",
                uiHandler: [ui],
                calYear: 1,
                attrOpt: { "aria-label": LOCALE.NEXT },
              }),
            ],
          }),
          Skeletons.Box.X({
            className: `${pfx}__range-months`,
            kids: Array.from({ length: 12 }, (_, m) =>
              Skeletons.Note({
                className: `${pfx}__range-month`,
                content: Dayjs().month(m).format("MMM"),
                attrOpt: { "data-active": m === cursorMonth ? "1" : "0" },
                bubble: 0,
                service: "cal-set-month",
                uiHandler: [ui],
                calMonth: m,
              }),
            ),
          }),
        ],
      })
    : null;

  const label = Skeletons.Box.Y({
    className: `${pfx}__range-picker`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__range`,
        attrOpt: { "data-open": ui.isRangeMenuOpen() ? "1" : "0" },
        bubble: 0,
        service: "cal-toggle-range-menu",
        uiHandler: [ui],
        // ui-core binds a click to EVERY widget that does not set active:0,
        // and its handler calls e.stopPropagation() BEFORE triggerHandlers —
        // so a child left at the default eats the click and this service never
        // fires. Clicking the label did nothing; only the padding worked.
        kidsOpt: { active: 0 },
        kids: [
          Skeletons.Note({
            className: `${pfx}__range-label`,
            content: rangeLabel(view, ui.getCursor()),
          }),
          Skeletons.Image.Svg({
            ico: "ph-caret-down",
            className: `${pfx}__range-caret`,
          }),
        ],
      }),
      rangeMenu,
    ].filter(Boolean),
  });

  // ── view dropdown ──────────────────────────────────────────────────────────
  const current = VIEWS.find((v) => v.key === view) || VIEWS[0];
  const viewMenu = ui.isViewMenuOpen()
    ? Skeletons.Box.Y({
        className: `${pfx}__menu`,
        attrOpt: { "data-anchor": "view" },
        kids: VIEWS.map((v) =>
          Skeletons.Note({
            className: `${pfx}__menu-item`,
            content: LOCALE[v.label],
            attrOpt: { "data-active": v.key === view ? "1" : "0" },
            bubble: 0,
            service: "cal-set-view",
            uiHandler: [ui],
            calView: v.key,
          }),
        ),
      })
    : null;

  const viewPicker = Skeletons.Box.Y({
    className: `${pfx}__view-picker`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__view-button`,
        attrOpt: { "data-open": ui.isViewMenuOpen() ? "1" : "0" },
        bubble: 0,
        service: "cal-toggle-view-menu",
        uiHandler: [ui],
        // See __range above — a child without active:0 swallows the click.
        kidsOpt: { active: 0 },
        kids: [
          Skeletons.Image.Svg({
            ico: "sidebar_calendar",
            className: `${pfx}__view-ico`,
          }),
          Skeletons.Note({
            className: `${pfx}__view-label`,
            content: LOCALE[current.label],
          }),
          Skeletons.Image.Svg({
            ico: "ph-caret-down",
            className: `${pfx}__view-caret`,
          }),
        ],
      }),
      viewMenu,
    ].filter(Boolean),
  });

  // ── All / Task only / Meeting only ─────────────────────────────────────────
  // Not persisted: the spec is explicit that it resets to All each session.
  const filterBar = Skeletons.Box.X({
    className: `${pfx}__filter`,
    kids: FILTERS.map((f) =>
      Skeletons.Note({
        className: `${pfx}__filter-item`,
        content: LOCALE[f.label],
        attrOpt: { "data-active": f.key === filter ? "1" : "0" },
        bubble: 0,
        service: "cal-set-filter",
        uiHandler: [ui],
        calFilter: f.key,
      }),
    ),
  });

  // ── + New ▾ ────────────────────────────────────────────────────────────────
  const newMenu = ui.isNewMenuOpen()
    ? Skeletons.Box.Y({
        className: `${pfx}__menu`,
        attrOpt: { "data-anchor": "new" },
        kids: [
          Skeletons.Button.Label({
            className: `${pfx}__menu-item`,
            ico: "app-task-list",
            label: LOCALE.TASK,
            bubble: 0,
            service: "cal-new-task",
            uiHandler: [ui],
          }),
          Skeletons.Button.Label({
            className: `${pfx}__menu-item`,
            ico: "ph-video",
            label: LOCALE.MEETING,
            bubble: 0,
            service: "cal-new-meeting",
            uiHandler: [ui],
          }),
        ],
      })
    : null;

  const newButton = Skeletons.Box.Y({
    className: `${pfx}__new`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__new-button`,
        attrOpt: { "data-open": ui.isNewMenuOpen() ? "1" : "0" },
        bubble: 0,
        service: "cal-toggle-new-menu",
        uiHandler: [ui],
        // See __range above. This is why clicking the "+" or the word "New"
        // did nothing while a click on the button's padding opened the menu.
        kidsOpt: { active: 0 },
        kids: [
          Skeletons.Note({ className: `${pfx}__new-plus`, content: "+" }),
          Skeletons.Note({ className: `${pfx}__new-label`, content: LOCALE.NEW }),
        ],
      }),
      newMenu,
    ].filter(Boolean),
  });

  // The two halves, WITHOUT the row that holds them. Opening a dropdown has
  // to repaint the toolbar and nothing else — see `sys_pn: "toolbar"` below
  // and _renderToolbar() in ../index.js — so the kids have to be reachable
  // separately from the row, because feed() replaces a part's CHILDREN.
  return [
    Skeletons.Box.X({
      className: `${pfx}__toolbar-left`,
      kids: [nav, label],
    }),
    Skeletons.Box.X({
      className: `${pfx}__toolbar-right`,
      kids: [viewPicker, filterBar, newButton],
    }),
  ];
};

/**
 * The toolbar row itself. Carries the part name the panel re-feeds.
 */
module.exports.row = function (ui) {
  return Skeletons.Box.X({
    className: `${ui.fig.family}__toolbar`,
    sys_pn: "toolbar",
    partHandler: ui,
    kids: module.exports(ui),
  });
};
