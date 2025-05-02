/* ================================================================== *
 * Copyright Xialia.com  2011-2021
 * FILE : /src/drumee/builtins/window/helpdesk/skeleton/content.js
 * TYPE : Skeleton
 * ===================================================================**/

function __skl_window_sync_content(_ui_, kids) {
  const contentFig = `${_ui_.fig.family}`;
  const list = Skeletons.List.Smart({
    className: `${contentFig}__list`,
    sys_pn: 'items-list',
    flow: _a.none,
    bubble: 0,
    vendorOpt: Preset.List.Orange_e,
    kids,
    uiHandler: _ui_,
  })

  const summary = Skeletons.Box.X({
    className: `${contentFig}__summary`,
    kids: [
      Skeletons.Note({
        className: `${contentFig}__summary text`,
        content: LOCALE.UNSYNCED_FILES_TIPS
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
          list
        ]
      })
    ]
  })

  return a;
}
module.exports = __skl_window_sync_content;
