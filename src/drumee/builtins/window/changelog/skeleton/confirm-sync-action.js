/* ================================================================== *
 * Copyright Xialia.com  2011-2021
 * FILE : /src/drumee/builtins/window/helpdesk/skeleton/content.js
 * TYPE : Skeleton
 * ===================================================================**/

function __skl_window_confirm_sync_action(_ui_, type) {
  const contentFig = `${_ui_.fig.family}`;
  
  const summary = Skeletons.Box.Y({
    className: `${contentFig}__confirm-sync`,
    kids: [
      Skeletons.Note({
        className: `${contentFig}__confirm-sync heading`,
        content: type == 'close' ? LOCALE.SYNC_STOP_HEADING : LOCALE.SYNC_LAUNCH_HEADING
      }),
      Skeletons.Note({
        className: `${contentFig}__confirm-sync text`,
        content: type == 'close' ? LOCALE.SYNC_STOP_DESC : LOCALE.SYNC_LAUNCH_DESC
      })
    ]
  })

  let buttons = Skeletons.Box.X({
    className: `${contentFig}__command`,
    uiHandler: _ui_,
    kids: [
      Skeletons.Note({
        className: `button sync`,
        content: type == 'close' ? LOCALE.SYNC_STOP : LOCALE.SYNC_LAUNCH,
        service: type == 'close' ? type : 'proceed-sync'
      }),
      Skeletons.Note({
        className: `button sync`,
        content: LOCALE.BACK,
        service: 'back-to-check-sync'
      })
    ]
  })


  let a = Skeletons.Box.Y({
    className: `${contentFig}__main`,
    debug: __filename,
    kids: [
      summary,
      buttons
    ]
  })

  return a;
}
module.exports = __skl_window_confirm_sync_action;
