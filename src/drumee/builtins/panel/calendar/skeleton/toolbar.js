// View toolbar, Figma 1697:47993 (Personal) / 1693:180534 (Team):
//
//   [ ‹ Today › ]  June, 2026 ▾        [Month ▾] [Personal | Team] [≡ All] [+ New]
//
// ‹ and › step the range; "Today" brings it back to today in the current view.
// The range label opens the mini calendar, and its caret flips while the popup
// is open, as the view button's does. The range label, the view button, the
// filter button and New each own a dropdown, and all four share one mechanism:
// one open at a time, closed by a click anywhere outside the row (_openMenu /
// _syncMenuDismiss in ../index.js).
const { VIEWS, FILTERS, AUDIENCES, rangeLabel, day, ymd } = require("./helpers");

// The personal task and meeting forms open from "+ New" (Figma 1693:164274),
// and from a day cell's "+", which opens the same Task / Meeting menu due that
// day (dayMenu below).
const SHOW_NEW_BUTTON = true;

// Icon + label row, built the way the desk topbar's own "New" menu builds
// one (modules/desk/skeleton/topbar.js → newMenuRow): a Box.X carrying the
// service, with the icon and the label as inert kids.
//
// NOT Skeletons.Button.Label. Its template renders the sprite as
// `<svg class="full …">` — width:100%/height:100% — and Button.Label gives
// the icon no box of its own, so inside a text-height menu row the svg
// claimed the whole 150px width and shoved the label out of the dropdown.
// An Image.Svg/Button.Svg in a pinned wrapper (see __menu-ico in the skin)
// is the shape the rest of the app uses for exactly this reason.
//
// `calDay` (a day cell's menu) names the day the form opens due on.
function newMenuRow(ui, ico, label, service, calDay) {
  const pfx = ui.fig.family;
  return Skeletons.Box.X({
    className: `${pfx}__menu-item`,
    bubble: 0,
    service,
    uiHandler: [ui],
    ...(calDay ? { calDay } : {}),
    // See __range above — a kid left interactive swallows the click before
    // triggerHandlers runs.
    kidsOpt: { active: 0 },
    kids: [
      Skeletons.Image.Svg({ ico, className: `${pfx}__menu-ico` }),
      Skeletons.Note({ className: `${pfx}__menu-label`, content: label }),
    ],
  });
}

module.exports = function (ui) {
  const pfx = ui.fig.family;
  const view = ui.getView();
  const filter = ui.getActiveFilter();
  const audience = ui.getActiveAudience();

  // ── range label + mini calendar ────────────────────────────────────────────
  const cursor = day(ui.getCursor()) || Dayjs();

  // The mini calendar behind the label — the SAME control the workspace Meet
  // tab's schedule opens from its own range pill
  // (window/folder/skeleton/meeting-schedule.js → pickerCal): ‹ month year ›,
  // a weekday row, six weeks of pickable days.
  //
  // It was a year stepper over a 12-month grid, which could not pick a DAY at
  // all: on the day view, the one control that names the range on screen could
  // not move that range by a day, and the two calendars answered the same click
  // with two different popups.
  //
  // The month the grid shows is its own state (`getPickerCursor`), not the
  // calendar's cursor — browsing to next March must not move the grid behind
  // the popup until a day is actually picked.
  const pickerCursor = day(ui.getPickerCursor()) || cursor;
  const gridStart = pickerCursor.startOf("month").startOf("week");
  const todayKey = ymd(Dayjs());
  // What the popup marks as "the range you are looking at": the whole week band
  // in week view, the single day otherwise. Same rule as the Meet tab's.
  const weekBand = view === "week";
  const selStart = weekBand ? cursor.startOf("week") : cursor.startOf("day");
  const selEnd = weekBand
    ? cursor.startOf("week").add(6, "day").endOf("day")
    : cursor.endOf("day");

  const pickerHead = Skeletons.Box.X({
    className: `${pfx}__range-head`,
    kids: [
      Skeletons.Button.Svg({
        className: `${pfx}__range-nav`,
        ico: "caret-left",
        bubble: 0,
        service: "cal-picker-step",
        uiHandler: [ui],
        calStep: -1,
        attrOpt: { "aria-label": LOCALE.PREVIOUS },
      }),
      Skeletons.Note({
        className: `${pfx}__range-month-label`,
        content: pickerCursor.format("MMMM YYYY"),
      }),
      Skeletons.Button.Svg({
        className: `${pfx}__range-nav`,
        ico: "caret-right",
        bubble: 0,
        service: "cal-picker-step",
        uiHandler: [ui],
        calStep: 1,
        attrOpt: { "aria-label": LOCALE.NEXT },
      }),
    ],
  });

  const pickerDows = Skeletons.Box.X({
    className: `${pfx}__range-dows`,
    kids: Array.from({ length: 7 }, (_, i) =>
      Skeletons.Note({
        className: `${pfx}__range-dow`,
        content: gridStart.add(i, "day").format("dd"),
      }),
    ),
  });

  const pickerWeeks = Array.from({ length: 6 }, (_, w) =>
    Skeletons.Box.X({
      className: `${pfx}__range-week`,
      kids: Array.from({ length: 7 }, (_, i) => {
        const d = gridStart.add(w * 7 + i, "day");
        const ds = ymd(d);
        const selected = !d.isBefore(selStart) && !d.isAfter(selEnd);
        return Skeletons.Note({
          className: `${pfx}__range-day`,
          content: String(d.date()),
          bubble: 0,
          service: "cal-pick-day",
          uiHandler: [ui],
          calDay: ds,
          attrOpt: {
            "data-in": d.month() === pickerCursor.month() ? "1" : "0",
            "data-sel": selected ? "1" : "0",
            "data-today": ds === todayKey ? "1" : "0",
          },
        });
      }),
    }),
  );

  const rangeMenu = ui.isMenuOpen("range")
    ? Skeletons.Box.Y({
        className: `${pfx}__menu ${pfx}__range-menu`,
        attrOpt: { "data-anchor": "range" },
        kids: [pickerHead, pickerDows, ...pickerWeeks],
      })
    : null;

  // [ ‹ Today › ] — three controls in one grey pill. The pill itself carries
  // no service, so each kid keeps its own click.
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
        className: `${pfx}__today`,
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

  // "June, 2026 ▾". The popup is a sibling of the label inside __range-picker
  // (position: relative), so it anchors under the label and does not move with
  // the text inside it.
  const range = Skeletons.Box.X({
    className: `${pfx}__range`,
    attrOpt: { "data-open": ui.isMenuOpen("range") ? "1" : "0" },
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
  });

  const label = Skeletons.Box.Y({
    className: `${pfx}__range-picker`,
    kids: [range, rangeMenu].filter(Boolean),
  });

  // ── view dropdown ──────────────────────────────────────────────────────────
  const current = VIEWS.find((v) => v.key === view) || VIEWS[0];
  const viewMenu = ui.isMenuOpen("view")
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
        attrOpt: { "data-open": ui.isMenuOpen("view") ? "1" : "0" },
        bubble: 0,
        service: "cal-toggle-view-menu",
        uiHandler: [ui],
        // See __range above — a child without active:0 swallows the click.
        kidsOpt: { active: 0 },
        kids: [
          Skeletons.Image.Svg({
            ico: "nudge-calendar-dots",
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

  // ── Personal | Team ────────────────────────────────────────────────────────
  // A segmented pair, not a dropdown: both choices stay on screen.
  const audienceBar = Skeletons.Box.X({
    className: `${pfx}__audience`,
    kids: AUDIENCES.map((a) =>
      Skeletons.Note({
        className: `${pfx}__audience-item`,
        content: LOCALE[a.label],
        attrOpt: { "data-active": a.key === audience ? "1" : "0" },
        bubble: 0,
        service: "cal-set-audience",
        uiHandler: [ui],
        calAudience: a.key,
      }),
    ),
  });

  // ── ≡ All / Task / Meeting ─────────────────────────────────────────────────
  // Not persisted: the spec is explicit that it resets to All each session.
  // The button names the current choice. The design draws the closed button
  // only, so the open list is built the way the view menu is.
  const currentFilter = FILTERS.find((f) => f.key === filter) || FILTERS[0];
  const filterMenu = ui.isMenuOpen("filter")
    ? Skeletons.Box.Y({
        className: `${pfx}__menu`,
        attrOpt: { "data-anchor": "filter" },
        kids: FILTERS.map((f) =>
          Skeletons.Note({
            className: `${pfx}__menu-item`,
            content: LOCALE[f.label],
            attrOpt: { "data-active": f.key === filter ? "1" : "0" },
            bubble: 0,
            service: "cal-set-filter",
            uiHandler: [ui],
            calFilter: f.key,
          }),
        ),
      })
    : null;

  const filterPicker = Skeletons.Box.Y({
    className: `${pfx}__filter-picker`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__filter-button`,
        attrOpt: {
          "data-open": ui.isMenuOpen("filter") ? "1" : "0",
          // The visible value stays in the accessible name: "Filter: Task".
          "aria-label": `${LOCALE.FILTER}: ${LOCALE[currentFilter.label]}`,
        },
        bubble: 0,
        service: "cal-toggle-filter-menu",
        uiHandler: [ui],
        // See __range above — a child without active:0 swallows the click.
        kidsOpt: { active: 0 },
        kids: [
          Skeletons.Image.Svg({
            ico: "app-filter-list",
            className: `${pfx}__filter-ico`,
          }),
          Skeletons.Note({
            className: `${pfx}__filter-label`,
            content: LOCALE[currentFilter.label],
          }),
        ],
      }),
      filterMenu,
    ].filter(Boolean),
  });

  // ── + New ▾ ────────────────────────────────────────────────────────────────
  const newMenu = ui.isMenuOpen("new")
    ? Skeletons.Box.Y({
        className: `${pfx}__menu`,
        attrOpt: { "data-anchor": "new" },
        kids: [
          newMenuRow(ui, "noti-list-checks", LOCALE.TASK, "cal-new-task"),
          newMenuRow(ui, "noti-video-camera", LOCALE.MEETING, "cal-new-meeting"),
        ],
      })
    : null;

  const newButton = Skeletons.Box.Y({
    className: `${pfx}__new`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__new-button`,
        attrOpt: { "data-open": ui.isMenuOpen("new") ? "1" : "0" },
        bubble: 0,
        service: "cal-toggle-new-menu",
        uiHandler: [ui],
        // See __range above. This is why clicking the "+" or the word "New"
        // did nothing while a click on the button's padding opened the menu.
        kidsOpt: { active: 0 },
        kids: [
          Skeletons.Image.Svg({ ico: "ph-plus", className: `${pfx}__new-plus` }),
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
      // SHOW_NEW_BUTTON hides "+ New" when set to false.
      // Personal | Team hidden for now (2026-10-26): the calendar stays on its
      // default audience, Team (every row). Put audienceBar back here to restore it.
      kids: [viewPicker, filterPicker, SHOW_NEW_BUTTON ? newButton : null].filter(Boolean),
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

/**
 * A day cell's "+" menu: the "+ New" dropdown's Task / Meeting rows, each
 * opening its form due on `calDay`. Fed into the page's floating day-menu slot
 * (../index.js _toggleDayMenu), never into the grid, so opening it repaints
 * nothing under it.
 */
module.exports.dayMenu = function (ui, calDay) {
  const pfx = ui.fig.family;
  return Skeletons.Box.Y({
    className: `${pfx}__menu`,
    attrOpt: { "data-anchor": "day" },
    kids: [
      newMenuRow(ui, "noti-list-checks", LOCALE.TASK, "cal-new-task", calDay),
      newMenuRow(ui, "noti-video-camera", LOCALE.MEETING, "cal-new-meeting", calDay),
    ],
  });
};
