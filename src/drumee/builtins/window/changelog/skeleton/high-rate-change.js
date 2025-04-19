/* ================================================================== *
 * Copyright Xialia.com  2011-2021
 * FILE : /src/drumee/builtins/window/helpdesk/skeleton/content.js
 * TYPE : Skeleton
 * ===================================================================**/


function __skl_window_hr_changes(_ui_) {
  const contentFig = `${_ui_.fig.family}`;

  let buttons = Skeletons.Box.X({
    className: `${contentFig}__command`,
    uiHandler: _ui_,
    kids: [
      Skeletons.Note({
        className: `button ignore window-confirm__button-secondary`,
        content: LOCALE.ALL_IS_NORMAL,
        service: 'ack-alert'
      }),
      Skeletons.Note({
        className: `button ignore window-confirm__button-secondary`,
        content: LOCALE.RETRIEVE,
        service: 'retrieve'
      }),
    ]
  })

  const summary = Skeletons.Box.X({
    className: `${contentFig}__engine-off`,
    kids: [
      Skeletons.Note({
        className: `${contentFig}__engine-off text`,
        content: LOCALE.HIGH_RATE_CHANGE
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
          buttons
        ]
      })
    ]
  })

  return a;
}
module.exports = __skl_window_hr_changes;
