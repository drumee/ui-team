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

  // Three different nothings, and they must not read alike:
  //   not loaded yet  → say nothing; an unfetched month and an empty one look
  //                     identical, and "Nothing scheduled" is a claim we cannot
  //                     make before the answer arrives
  //   load failed     → say so, rather than reporting an empty calendar for a
  //                     read that never landed (the state while calendar.list
  //                     is unimplemented)
  //   genuinely empty → "Nothing scheduled"
  const items = ui.getVisibleItems();
  const empty = !items.length;
  let emptyText = null;
  if (empty && ui.hasLoaded()) {
    emptyText = ui.hasLoadFailed() ? LOCALE.TRY_AGAIN : LOCALE.CAL_NOTHING_SCHEDULED;
  }

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

      toolbar(ui),

      Skeletons.Box.Y({
        className: `${pfx}__body`,
        attrOpt: { "data-empty": empty ? "1" : "0" },
        kids: [
          grid,
          // Sits over the grid rather than replacing it: the month frame keeps
          // its cells (and their quick-add "+") on an empty month.
          emptyText
            ? Skeletons.Note({
                className: `${pfx}__empty`,
                content: emptyText,
                attrOpt: { "data-failed": ui.hasLoadFailed() ? "1" : "0" },
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
