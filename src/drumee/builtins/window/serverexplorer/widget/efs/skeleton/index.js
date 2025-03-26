/* ================================================================== *
 *   Copyright Xialia.com  2011-2023
 *   FILE : /ui/src/drumee/builtins/window/serverexplorer/widget/efs/skeleton/index.js
 *   TYPE : Skeleton
 * ===================================================================**/

function __skl_widget_efs (_ui_) {

  const m = _ui_.model.toJSON();

  let ext  = m.ext;
  switch(ext) {
    case false:
      ext = 'folder';
      break;
    
    case ".txt":
      ext = 'document';
      break;
    
    default:
      ext = 'document';
  }

  const preview = require('./preview').default(_ui_, ext, m);

  const filename = require('./filename').default(_ui_, ext, m);

  const checkbox = require('./checkbox').default(_ui_, ext, m);

  let a = Skeletons.Box.Y({
    className : `${_ui_.fig.family}__container ${ext}`,
    debug     : __filename,
    sys_pn    : _a.content,
    kids      : [
      Skeletons.Box.X({
        className : `full ${_ui_.fig.family}__content ${ext}`,
        service   : _a.openLocation,
        uiHandler : [_ui_],
        kids      : [
          preview,
          filename,
          checkbox
        ]
      })
    ]
  })

  return a;
}

export default __skl_widget_efs;
