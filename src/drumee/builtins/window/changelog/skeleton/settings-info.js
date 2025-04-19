
function __skl_window_sync_changes(_ui_) {
  const contentFig = `${_ui_.fig.family}`;

  let infoText = LOCALE.SYNC_CLOUD_TO_DESK_INFO;
  let descriptionText = LOCALE.SYNC_CLOUD_TO_DESK_DES;

  let summaryTitle = LOCALE.SYNC_CLOUD_COMPUTER.format("#4a90e2");
  let arrowIcon = 'arrow-up-solid';
  console.log("AAA:55 10", _ui_.mget('sync_direction'), Wm.mget('sync_direction'))
  if (_ui_.mget('sync_direction') === 'upstream') {
    summaryTitle = LOCALE.SYNC_COMPUTER_CLOUD.format("#4a90e2");
    descriptionText = LOCALE.SYNC_DESK_TO_CLOUD_DESC;
    arrowIcon = 'arrow-down-solid';
  }

  if (_ui_.mget('sync_direction') === 'duplex') {
    summaryTitle = LOCALE.CHANGES_SUMMARY.format("#4a90e2");
    descriptionText = LOCALE.SYNC_BOTH_WAY_DESC;
    arrowIcon = 'arrows-up-down-solid';
  }

  let info = Skeletons.Box.X({
    className: `${contentFig}__summary-header`,
    kids: [
      Skeletons.Note({
        className: `info`,
        content: infoText,
      }),
    ]
  })

  let defaultService = _a.close;
  if(_ui_.mget('engine') == _a.on){
    defaultService = 'start-sync';
  }

  let buttons = Skeletons.Box.X({
    className: `${contentFig}__command`,
    uiHandler: _ui_,
    kids: [
      Skeletons.Note({
        className: `button sync`,
        content: LOCALE.OK,
        service: defaultService
      })
    ]
  })

  const summary = Skeletons.Box.X({
    className: `${contentFig}__summary-header`,
    kids: [
      Skeletons.Note({
        className: `${contentFig}__summary text`,
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
          Skeletons.Box.X({
            className: `${contentFig}__icons container`,
            kids: [
              Skeletons.Button.Svg({
                ico: 'cloud-solid',
                className: `${contentFig}__icons cloud-icon-info`,
              }),
              Skeletons.Button.Svg({
                ico: arrowIcon,
                className: `${contentFig}__icons arrow-icon-info`,
              }),
              Skeletons.Button.Svg({
                ico: 'desktop-solid',
                className: `${contentFig}__icons desktop-icon-info`,
              }),
            ]
          }),
          Skeletons.Box.X({
            className: `${contentFig}__summary-header`,
            kids: [
              Skeletons.Note({
                className: `${contentFig}__summary desc`,
                content: descriptionText
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
