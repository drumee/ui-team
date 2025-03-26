/* ================================================================== *
 * Copyright Xialia.com  2011-2020
 * FILE : src/drumee/builtins/window/sharebox/widget/sharebox-setting/skeleton/index.js
 * TYPE : Skeleton
 * ===================================================================**/
/// <reference path="../../../../../../../../@types/index.d.ts" />

/**
 * 
 * @param {*} _ui_
 */
function sharebox_setting  (_ui_) {
  
  let a = Skeletons.Box.Y({
    className  : `${_ui_.fig.family}__main`,
    debug      : __filename,
    kids       : [
      Skeletons.Box.X({
        className  : `${_ui_.fig.family}__container`,
        kids : [          
          require('./body-wrapper').default(_ui_)
        ]
      }),
      Skeletons.Button.Svg({
        ico       : 'tools_delete',
        className : `${_ui_.fig.family}__icon destroy tools_delete`,
        service   : 'delete-sharebox',
        uiHandler : _ui_,
      }),
      Preset.Button.Close(_ui_,'close-popup'),
    ]
  })
  
  return a;
}

export default sharebox_setting