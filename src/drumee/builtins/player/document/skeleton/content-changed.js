/* ==================================================================== *
*   Copyright Xialia.com  2011-2023
*   FILE : \src\drumee\modules\desk\wm\skeleton\electron\new-version.js
*   TYPE : Skeleton
* ==================================================================== */

const __skl_content_changed = function (_ui_) {
  const versionFig = `${_ui_.fig.family}-new-content-popup`;

  const buttons = Skeletons.Box.X({
    className: `${versionFig}__buttons-wrapper`,
    kidsOpt:{
      bubble : _a.none
    },
    kids:[
      Skeletons.Note({
        className: `${versionFig}__button cancel`,
        content: LOCALE.LATER,
        service : 'skip-new-version',
      }),
      Skeletons.Note({
        className: `${versionFig}__button confirm`,
        sys_pn : 'confirmButton',
        content: LOCALE.YES,
        service    : 'read-new-version',
      }),
    ]
  });

  const a = Skeletons.Box.Y({
    debug: __filename,
    className: `${versionFig}__container`,
    kids: [
      Skeletons.Note({
        className: `${versionFig}__note message`,
        content: LOCALE.CONTENT_JUST_CHANGED
      }),
      buttons
    ]
  })
  return a
}

export default __skl_content_changed
