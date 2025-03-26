// ==================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : ../src/drumee/libs/reader/calendar/month/skeleton/daynames
//   TYPE : Skeleton
// ==================================================================== *

const __skl_calendar_daynames = function(_ui_) {

  const dayNames = ["M", "T", "W", "T", "F", "S", "S"];

  const b = [];

  for (let i = 0; i < dayNames.length; i++) {
    var dn = dayNames[i];
    var dcn = `${_ui_.fig.family}__date --name`;
    if (i > 4) {
      dcn = `${dcn} --weekend`;
    }
    var _dn_skl = Skeletons.Box.X({
      cn: dcn,
      kids: [
        Skeletons.Note({ content: dn })
      ]
    });
    b.push(_dn_skl);
  }

  const a = Skeletons.Box.X({
    cn     : `${_ui_.fig.family}__${_a.week} --names`,
    kids   : b
  });

  return a;
};

module.exports = __skl_calendar_daynames;
