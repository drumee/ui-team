/* ==================================================================== *
*   Copyright Xialia.com  2011-2023
*   FILE : \src\drumee\modules\desk\wm\skeleton\electron\new-version.js
*   TYPE : Skeleton
* ==================================================================== */

const __skl_wm_electron_new_version = function (_ui_, data) {
  // const button_class = `${_ui_.fig.family}__button launcher`
  const versionFig = `${_ui_.fig.family}-new-version-popup`;

  let {version, readyToInstall} = data;
  let state = 0;
  if(readyToInstall) state = 1;
  const buttons = Skeletons.Box.X({
    className: `${versionFig}__buttons-wrapper`,
    kidsOpt:{
      bubble : _a.none
    },
    kids:[
      Skeletons.Note({
        className: `${versionFig}__button cancel`,
        content: LOCALE.LATER,
        service : 'close-update-popup',
      }),
      Skeletons.Note({
        className: `${versionFig}__button confirm`,
        sys_pn : 'confirmButton',
        content: LOCALE.YES,
        service    : 'install-new-version',
        state
      }),
    ]
  });

  const a = Skeletons.Box.Y({
    debug: __filename,
    className: `${versionFig}__container`,
    kids: [
      Skeletons.Note({
        className: `${versionFig}__note message`,
        content: LOCALE.NEW_VERSION_AVAILABLE.format(version)
      }),
      Skeletons.Element({
        className: `${versionFig}__progress`,
        sys_pn : 'updateProgress'
      }),
      buttons
    ]
  })
  return a
}

export default __skl_wm_electron_new_version
