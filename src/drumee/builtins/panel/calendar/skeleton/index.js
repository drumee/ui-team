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
  return [];
}

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
