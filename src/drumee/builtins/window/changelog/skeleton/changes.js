

/**
 * 
 * @param {*} ui 
 * @returns 
 */
function main(ui) {
  let contentFig = `${ui.fig.family}`;

  let summaryTitle = LOCALE.CHANGES_SUMMARY

  let buttons = Skeletons.Box.X({
    className: `${contentFig}__command`,
    uiHandler: ui,
    kids: [
      Skeletons.Note({
        className: `button sync`,
        content: LOCALE.SHOW_CHANGELOG,
        service: 'show-changelog'
      }),
      Skeletons.Note({
        className: `button sync`,
        content: LOCALE.SYNC_ALL,
        service: 'sync-all'
      }),
      Skeletons.Note({
        className: `button sync`,
        content: LOCALE.DECIDE_LATER,
        service: _e.close
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
            sys_pn: "changelog-container",
            className: `${contentFig}__summary-content`,
          }),
          buttons,
        ]
      })
    ]
  })

  return a;
}
module.exports = main;
