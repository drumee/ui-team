/* ================================================================== *
 *   Copyright Xialia.com  2011-2023
 *   FILE : /ui/src/drumee/builtins/window/serverexplorer/skeleton/footer.js
 *   TYPE : Skeleton
 * ===================================================================**/

function __media_skl_efs_footer (_ui_) {
  const footerFig = `${_ui_.fig.family}-footer`;
  let fileSelectedCount = '';

  if (_ui_.type == _a.import) {
    fileSelectedCount = Skeletons.Box.X({
      className : `${footerFig}__files-count`,
      kids      : [
        Skeletons.Note({
          className : `${footerFig}__note count`,
          sys_pn    : 'files-count',
          content   : _ui_.selectedImportFileList.length || '0'
        }),
        Skeletons.Note({
          className : `${footerFig}__note text`,
          content   : " File(s) Selected"
        })
      ]
    })
  }

  let confirmButtonLabel = 'Import';
  let confirmButtonService = 'import-files';
  let btnState = _a.closed;
  if (_ui_.type == _a.export) {
    confirmButtonLabel = 'Export';
    confirmButtonService = 'export-files';
    btnState = _a.open;
  }

  const buttons = Skeletons.Box.X({
    className : `${footerFig}__buttons_container`,
    sys_pn    : 'buttons-container',
    dataset   : {
      mode  : btnState
    },
    kids      : [
      Preset.ConfirmButtons(_ui_, {
        cancelLabel       : LOCALE.CANCEL || '',
        cancelService     : _e.close,
        confirmLabel      : confirmButtonLabel,
        confirmService    : confirmButtonService,
        confirmBtnAction  : _ui_.type
      })
    ]
  })
  

  const content = Skeletons.Box.X({
    className : `${footerFig}__content`,
    kids      : [
      fileSelectedCount,
      buttons
    ]
  })

  const a = Skeletons.Box.X({
    className: `${footerFig}__container ${_ui_.fig.group}__footer`,
    debug     : __filename,
    kids      : [
      content
    ]
  })

  return a;
}

export default __media_skl_efs_footer;