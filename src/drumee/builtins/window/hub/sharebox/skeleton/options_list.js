/* ================================================================== *
 * Copyright Xialia.com  2011-2020
 * FILE : src/drumee/builtins/window/hub/sharebox/skeleton/options_list.js
 * TYPE : Skelton
 * ===================================================================**/

/*
*
*/
function __skl_option_list (_ui_) {
  let a = Skeletons.Box.X({
    className  : `${_ui_.fig.family}__options-list-wrapper`,
    debug      : __filename,
    kids       : [
      Skeletons.Box.X({
        className : `${_ui_.fig.family}__option-item-wrapper`,
        service   : 'change-options',
        radio     : 'options',
        value     : 'permissions-setting',
        sys_pn    : 'permissions-icon',
        kidsOpt   : {active:0},
        kids: [
          Skeletons.Button.Svg({
            ico       : 'editbox_cog',
            className : `${_ui_.fig.family}__icon settings`,
          })
        ]
      }),
      Skeletons.Box.X({
        className : `${_ui_.fig.family}__option-item-wrapper`,
        service   : 'change-options',
        radio     : 'options',
        value     : 'validity-setting',
        sys_pn    : 'validity-icon',
        kidsOpt   : {active:0},
        kids: [
          Skeletons.Button.Svg({
            ico       : 'backoffice_history',
            className : `${_ui_.fig.family}__icon time`,
          })
        ]
      }),
      Skeletons.Box.X({
        className :  `${_ui_.fig.family}__option-item-wrapper`,
        service   : 'change-options',
        radio     : 'options',
        value     : 'password-setting',
        sys_pn    : 'password-setting-icon',
        kidsOpt   : {active:0},
        kids  : [
          Skeletons.Button.Svg({
            ico       : 'lock',
            className : `${_ui_.fig.family}__icon lock`,
          })
        ]
      }),
    ]
  })
  return a;
}
export default __skl_option_list;
