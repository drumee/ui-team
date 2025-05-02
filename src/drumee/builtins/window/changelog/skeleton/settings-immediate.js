
function __skl_window_sync_changes(_ui_, disk_free, Cloud_volume) {
  const contentFig = `${_ui_.fig.family}`;

  let infoText = LOCALE.SWITCH_SYNC_BETWEEN_MODE;

  let summaryTitle = LOCALE.SET_IMMEDIATE_SYNC;

  let info = Skeletons.Box.X({
    className: `${contentFig}__immediate-header`,
    kids: [
      Skeletons.Note({
        className: `info`,
        content: infoText,
      }),
    ]
  })

  let buttons = Skeletons.Box.X({
    className: `${contentFig}__command`,
    uiHandler: _ui_,
    kids: [
      Skeletons.Note({
        className: `button sync`,
        content: LOCALE.OK,
        service: 'close'
      })
    ]
  })

  const summary = Skeletons.Box.X({
    className: `${contentFig}__immediate-header`,
    kids: [
      Skeletons.Note({
        className: `${contentFig}__immediate text`,
        content: summaryTitle
      })
    ]
  })

  let a = Skeletons.Box.Y({
    className: `${contentFig}__main`,
    debug: __filename,
    kids: [
      Skeletons.Box.Y({
        className: `${contentFig}__container`,
        kids: [
          summary,

          Skeletons.Box.Y({
            className: `${contentFig}__immediate-header`,
            kids: [
              Skeletons.Note({
                className: `${contentFig}__immediate desc`,
                content: LOCALE.DRUMEE_CLOUD_VOLUME.format(Cloud_volume)
              }),
              Skeletons.Note({
                className: `${contentFig}__immediate desc space`,
                content: LOCALE.LOCAL_SPACE.format(disk_free)
              })
            ]
          }),

          info,
          buttons
        ]
      })
    ]
  })

  return a;
}
module.exports = __skl_window_sync_changes;
