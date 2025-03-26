// ==================================================================== *
//   Copyright Xialia.com  2011-2023
//   FILE : /ui/src/drumee/builtins/window/serverexplorer/widget/efs/skeleton/checkbox.js
//   TYPE : Skeleton
// ==================================================================== *

function __skl_media_efs_checkbox (_ui_, ext, m) {

  if ((_ui_.type == _a.export) && (ext == _a.document) ) return;

  let a = Skeletons.Button.Svg({
    className : `${_ui_.fig.family}__checkbox checkbox--icon ${ext} full`,
    icons     : ["editbox_shapes-roundsquare", "available"],
    sys_pn    : 'file-selector',
    service   : 'select-file',
    state     : 0,
    uiHandler : _ui_,
    value     : _ui_.mget('path'),
    path      : _ui_.mget('file'),
    formItem  : 'file',
    type      : _ui_.type
  })

  if (_ui_.type == _a.export) {
    a.radio = 'export-file';
  }

  return a;
}

export default __skl_media_efs_checkbox;
