// Notification filter (Lexis 2026-09-28, mock ftn1): the header's "Filter"
// button and its popup, in place of the old Unreads toggle.
//
// No filter (the default) is the panel as it always was: read and unread rows,
// bookmarked rows pinned on top. A filter narrows it:
//  * all        — bookmarked rows (pinned on top) + unread rows
//  * unread     — unread rows only (the old Unreads toggle ON)
//  * bookmarked — bookmarked rows only
// The popup only edits a pending choice; Apply commits it, Clear drops the
// filter. The lit radio is not stamped per row: the popup carries data-pick
// and the skin lights the matching __vf-option--<value>.
const VIEW_FILTERS = ['all', 'unread', 'bookmarked'];

const VIEW_FILTER_LABELS = {
  all: 'ALL',
  unread: 'NOTI_FILTER_UNREAD',
  bookmarked: 'NOTI_FILTER_BOOKMARKED',
};

// What the button reads: the active filter's name, or "Filter" when none.
function buttonLabel(filter) {
  return LOCALE[VIEW_FILTER_LABELS[filter]] || LOCALE.FILTER;
}

function option(ui, pfx, filter) {
  return Skeletons.Box.X({
    className: `${pfx}__vf-option ${pfx}__vf-option--${filter}`,
    service: 'view-filter-pick',
    name: filter,
    uiHandler: [ui],
    // `active: 0` on each kid (kidsOpt is a no-op, see topbar.js): a live
    // child would swallow the click meant for the row.
    kids: [
      Skeletons.Box.X({ className: `${pfx}__vf-radio`, active: 0 }),
      Skeletons.Note({
        className: `${pfx}__vf-option-label`,
        content: LOCALE[VIEW_FILTER_LABELS[filter]],
        active: 0,
      }),
    ],
  });
}

module.exports = function (ui) {
  const pfx = ui.fig.family;
  const current = ui._viewFilter || '';

  return Skeletons.Box.X({
    className: `${pfx}__vf`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__vf-button`,
        sys_pn: 'view-filter-button',
        service: 'view-filter-open',
        uiHandler: [ui],
        dataset: { active: current ? '1' : '0' },
        kids: [
          Skeletons.Image.Svg({ ico: 'noti-filter', className: `${pfx}__vf-icon`, active: 0 }),
          Skeletons.Note({
            className: `${pfx}__vf-label`,
            sys_pn: 'view-filter-label',
            content: buttonLabel(current),
            active: 0,
          }),
          Skeletons.Image.Svg({ ico: 'ph-caret-down', className: `${pfx}__vf-caret`, active: 0 }),
        ],
      }),
      Skeletons.Box.Y({
        className: `${pfx}__vf-popup`,
        sys_pn: 'view-filter-popup',
        dataset: { open: '0', pick: current || VIEW_FILTERS[0] },
        kids: [
          Skeletons.Box.X({
            className: `${pfx}__vf-header`,
            kids: [
              Skeletons.Note({ className: `${pfx}__vf-title`, content: LOCALE.NOTI_FILTER_TITLE }),
              Skeletons.Button.Svg({
                ico: 'cross',
                className: `${pfx}__vf-close`,
                service: 'view-filter-close',
                uiHandler: [ui],
              }),
            ],
          }),
          Skeletons.Box.Y({
            className: `${pfx}__vf-options`,
            kids: VIEW_FILTERS.map((f) => option(ui, pfx, f)),
          }),
          Skeletons.Box.X({
            className: `${pfx}__vf-footer`,
            kids: [
              Skeletons.Note({
                className: `${pfx}__vf-clear`,
                content: LOCALE.CLEAR,
                service: 'view-filter-clear',
                uiHandler: [ui],
              }),
              Skeletons.Note({
                className: `${pfx}__vf-apply`,
                content: LOCALE.APPLY,
                service: 'view-filter-apply',
                uiHandler: [ui],
              }),
            ],
          }),
        ],
      }),
    ],
  });
};

// Exported so the panel validates picks against the one list defined here.
module.exports.VIEW_FILTERS = VIEW_FILTERS;
module.exports.buttonLabel = buttonLabel;
