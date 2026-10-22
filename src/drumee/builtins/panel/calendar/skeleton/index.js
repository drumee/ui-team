// Personal Calendar page — the full-canvas screen mounted in the desk's
// settings-main-slot. Figma 58222:173474.
//
// Structure: page title, view toolbar, one of the three grids, and a modal
// wrapper driven by widget state (the same declarative wrapper pattern the
// tasks board uses — the whole skeleton re-feeds on a state change rather than
// the widget poking at the DOM).
const toolbar = require("./toolbar");
const monthGrid = require("./month");
const weekGrid = require("./week");
const dayGrid = require("./day");
const taskForm = require("./task-form");
const meetingForm = require("./meeting-form");

const GRIDS = { month: monthGrid, week: weekGrid, day: dayGrid };

function modalKids(ui) {
  const form = ui.getForm();
  if (!form) return [];
  if (form.kind === "invite-link") {
    return [meetingForm.inviteLink(ui, form.link || "")];
  }
  if (form.kind === "meeting") return [meetingForm(ui)];
  if (form.kind === "task") return [taskForm(ui)];
  if (form.kind === "task-quick-open") return [quickOpen(ui, form.row)];
  return [];
}

// A workspace task (Figma 1697:50129): the board's own card, from the board's
// own panel mounted in quick-open mode for the row's hub. The box around it is
// this page's modal, so the toast dodge (_modalEl) and the slot lift see it;
// the card itself is drawn and styled by the board.
function quickOpen(ui, row) {
  const pfx = ui.fig.family;
  return Skeletons.Box.Y({
    className: `${pfx}__modal`,
    attrOpt: { "data-form": "task-quick-open" },
    kids: [
      {
        kind: "tasks_panel",
        hub_id: row.hub_id,
        open_task_id: row.id,
        // An explicit false is what locks the card; the viewer's role in that
        // workspace, read on the hub side by calendar.list.
        may_write: !!row.can_write,
        // The folder the task was filed under: where the panel files new
        // children and falls back for uploads, as the workspace window would
        // with the folder it stands in.
        nid: row.nid,
        scope_nid: row.nid,
        quick_open: 1,
        sys_pn: "quick-open-panel",
        partHandler: ui,
        uiHandler: [ui],
      },
    ],
  });
}

// Exported so the controller can re-feed ONLY the modal slot on open/close
// (index.js _renderModal) instead of rebuilding the page and grid around it.
module.exports = function (ui) {
  const pfx = ui.fig.family;
  const view = ui.getView();
  const grid = (GRIDS[view] || monthGrid)(ui);

  // A genuinely empty calendar says nothing — the month frame with no chips
  // already reads as "nothing scheduled", and an overlay in the middle of the
  // grid only covers the cells the user is about to click.
  // A failed read still speaks up: reporting an empty calendar for an answer
  // that never landed would be a lie (the state while calendar.list is
  // unimplemented). Not-loaded-yet stays silent too — an unfetched month and
  // an empty one look identical.
  const items = ui.getVisibleItems();
  const empty = !items.length;
  const emptyText = empty && ui.hasLoaded() && ui.hasLoadFailed() ? LOCALE.TRY_AGAIN : null;

  return Skeletons.Box.Y({
    className: `${pfx}__page`,
    attrOpt: { "data-view": view, "data-filter": ui.getActiveFilter() },
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__header`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__title`,
            content: LOCALE.PERSONAL_CALENDAR,
          }),
        ],
      }),

      toolbar.row(ui),

      Skeletons.Box.Y({
        className: `${pfx}__body`,
        attrOpt: { "data-empty": empty ? "1" : "0" },
        kids: [
          grid,
          // Sits over the grid rather than replacing it: the month frame keeps
          // its cells (and their quick-add "+") while the failure shows.
          emptyText
            ? Skeletons.Note({
                className: `${pfx}__empty`,
                content: emptyText,
                attrOpt: { "data-failed": "1" },
              })
            : null,
        ].filter(Boolean),
      }),

      // data-state="open" is the desk's own hook: settings-main-slot carries
      // `:has([data-state="open"]) { z-index: 20001 }`, which lifts the slot
      // above the sidebar (10002) and the side panels (10001) so a modal
      // backdrop covers the whole viewport instead of stopping at the 231px
      // sidebar. Same convention settings_main's overlay uses.
      // Transient toast slot (empty until _showToast feeds it) — Settings'
      // `settings-toast` slot. Outside the modal wrapper so feeding the
      // modal never clears it, and it stays up after the modal closes.
      Skeletons.Box.Y({
        className: `${pfx}__toast-slot`,
        sys_pn: "cal-toast",
        partHandler: ui,
      }),

      // A day cell's "+" menu (Task / Meeting), fed and placed under the "+"
      // by index.js _toggleDayMenu. One floating slot for the whole page, so
      // opening the menu never repaints the grid it hangs over.
      Skeletons.Box.Y({
        className: `${pfx}__day-menu-slot`,
        sys_pn: "cal-day-menu",
        partHandler: ui,
      }),

      Skeletons.Wrapper.Y({
        className: `${pfx}__modal-wrapper`,
        name: "cal-modal",
        partHandler: ui,
        attrOpt: { "data-state": ui.getForm() ? "open" : "closed" },
        kids: modalKids(ui),
      }),
    ],
  });
};

module.exports.modalKids = modalKids;
