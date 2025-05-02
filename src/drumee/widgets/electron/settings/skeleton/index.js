
const __option = require('./option');

const __menu_sync_menu = function (_ui_, e) {
  let l = LOCALE;
  let kids = [
    Skeletons.Box.Y({
      className: `${_ui_.fig.family}__container`,
      kids: [
        __option(_ui_, "disabled", l.NO_SYNC, l.NO_SYNC_TIPS),
        __option(_ui_, "integral", l.FULL_SYNC, l.FULL_SYNC_TIPS),
        __option(_ui_, "gradual", l.GRADUAL_SYNC, l.GRADUAL_SYNC_TIPS),
      ]
    }),
    Skeletons.Wrapper.X({
      sys_pn: `tooltips-wrapper`,
      className: `${_ui_.fig.family}__tooltips-wrapper`,
    }),
  ]

  return Skeletons.Box.Y({
    className: `${_ui_.fig.family}__main`,
    kids,
  })
}


module.exports = __menu_sync_menu