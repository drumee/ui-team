/* ================================================================== *
 * Copyright Xialia.com  2011-2023
 * FILE : /ui/src/drumee/builtins/window/serverexplorer/widget/efs_list/skeleton/index.js
 * TYPE : Skeleton
 * ===================================================================**/

function __skl_widget_efs_list  (_ui_) {

  let opt = {
    kind          : 'media_efs',
    type          : _ui_.type,
    uiHandler     : _ui_,
    logicalParent : _ui_,
  }

  if(_ui_.mget(_a.itemsOpt)) {
    _.merge(opt, _ui_.mget(_a.itemsOpt))
  }
  
  const list = Skeletons.List.Smart({
    className   : `window__icons-list`,
    innerClass  : `window__icons-scroll`,
    sys_pn      : _a.list,
    flow        : _a.none,
    //timer       : 2000,
    spinnerWait : 1500,
    spinner     : true,
    formItem    : 'fileList',
    dataType    : _a.array,
    dataset     : {
      role    : _a.container
    },
    itemsOpt    : opt,
    vendorOpt   : Preset.List.Orange_e,
    api         : _ui_.getFileList.bind(_ui_),
  })
  
  const a = Skeletons.Box.Y({
    className : `window__icons-container`,
    debug     : __filename,
    flow      : _a.y,
    kids      : [
      list
    ]
  })

  return a;
}

export default __skl_widget_efs_list;