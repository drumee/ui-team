

function __skl_window_note(ui) {
  const menu = Skeletons.Box.X({
    debug: __filename,
    className: `${ui.fig.family}__header ${ui.fig.group}__header`,
    sys_pn: "window-header",
    kidsOpt: {
      radio: _a.on,
      uiHandler: ui
    },
    kids: [
      require('./topbar')(ui),
      Skeletons.Box.X({
        debug: __filename,
        className: `${ui.fig.family}__acknowledgement-container`,
        kidsOpt: {
          radio: _a.on,
          uiHandler: ui
        },
        sys_pn: "acknowledgement-container",
        kids: [
          Skeletons.Note({
            className: `${ui.fig.family}__acknowledgement`,
            sys_pn: "acknowledgement",
          })
        ]
      })
    ]
  })
  const a = require('window/skeleton/content/main')(ui, menu)
  a.debug = __filename
  return a
}
module.exports = __skl_window_note;