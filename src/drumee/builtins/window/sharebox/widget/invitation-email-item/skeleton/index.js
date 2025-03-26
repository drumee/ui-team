/* ================================================================== *
 * Copyright Xialia.com  2011-2020
 * FILE : src/drumee/builtins/window/sharebox/widget/invitation-email-item/skeleton/index.js
 * TYPE : Skeleton
 * ===================================================================**/
/// <reference path="../../../../../../../../@types/index.d.ts" />

/**
 * 
 * @param {*} _ui_
 */
function invitation_email_item  (_ui_) {
  const profile_icon = Skeletons.Box.X({
    className  : `${_ui_.fig.family}__prefix-wrapper`,
    kids: [
      Skeletons.Note({
        className  : `${_ui_.fig.family}__profileicon`,
        content: "@"
      })
    ]
  })

  const name = Skeletons.Box.X({
    className  : `${_ui_.fig.family}__mid-wrapper`,
    kids: [
      Skeletons.Note({
        className : `${_ui_.fig.family}__note name`,
        content   : _ui_.mget('email')
      })
    ]
  })

  let options = null;
  options = Skeletons.Box.X({
    className  : `${_ui_.fig.family}__sufix-wrapper options-wrapper`,
    kidsOpt    : {
      active: 1
    },
    kids: [
      Skeletons.Button.Svg({
        ico         : 'tools_delete',
        className   : `${_ui_.fig.family}__icon option-icons remove-admin tools_delete`,
        service     : 'remove-user',
        uiHandler   : _ui_
      })
    ]
  })
  
  
  
  let a = Skeletons.Box.Y({
    className  : `${_ui_.fig.family}__main`,
    debug      : __filename,
    kids       : [
      Skeletons.Box.X({
        className  : `${_ui_.fig.family}__container`,
        kids : [
          profile_icon,
          name,
          options
        ]
      })
    ]
  })
  
  return a;
}

export default invitation_email_item