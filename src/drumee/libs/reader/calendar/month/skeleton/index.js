/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : ../src/drumee/libs/reader/calendar/month/skeleton
//   TYPE : Skeleton
// ==================================================================== *

const __skl_calendar_month = function(_ui_) {

  const a = [
    Skeletons.Note({
      cn : `${_ui_.fig.family}__name`,
      content: _ui_.monthData.name
    }),
    require('./daynames')(_ui_)
  ];

  for (var w of Array.from(_ui_.monthData.weeks)) { a.push(require('./week')(_ui_, w)); }


  a.plug(_a.debug, __filename);
  return a;
};

module.exports = __skl_calendar_month;
