/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : ../src/drumee/libs/reader/calendar/month/week
//   TYPE : Skeleton
// ==================================================================== *

const __skl_calendar_month_week = function(_ui_, week) {

  const k = [];
  for (var d of Array.from(week.days)) {
    var dcn         = `${_ui_.fig.family}__date`;
    if (d.isPast) {
      dcn       = `${dcn} --inactive`;
    }
    if (d.isCurrent) {
      dcn       = `${dcn} --current`;
    }
    if (d.isSelected) {
      dcn       = `${dcn} --selected`;
    }
    if (d.isWeekend) {
      dcn       = `${dcn} --weekend`;
    }
    if (d.isHidden) {
      dcn       = `${dcn} --hidden`;
    }
    var day = Skeletons.Note({
      cn        : `${dcn}`,
      content   : d.date,
      uiHandler : _ui_.calendarUi,
      service   : "select-date"
    });
    k.push(day);
  }

  let cn            = `${_ui_.fig.family}__week`;
  if (week.isPast) {
    cn          = `${cn} --inactive`;
  }

  const a = Skeletons.Box.X({
    className   : cn,
    kids        : k
  });

  return a;
};

module.exports = __skl_calendar_month_week;
