// ==================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : ../src/drumee/libs/reader/calendar/datepicker/skeleton/wrapper
//   TYPE : Skeleton
// ==================================================================== *

const __skl_calendar_datepicker_wrapper = (_ui_, position) => Skeletons.Box.Y({
  cn                 : `${_ui_.fig.family}__${_a.wrapper}`,
  sys_pn             : `${_a.datepicker}-${_a.wrapper}`,
  styleOpt           : {
    left               : position.x,
    top                : position.y
  },
  kids               : [{
    kind             : KIND.calendar.month,
    matrix           : _ui_.matrix
  }
  ]
});

module.exports = __skl_calendar_datepicker_wrapper;
