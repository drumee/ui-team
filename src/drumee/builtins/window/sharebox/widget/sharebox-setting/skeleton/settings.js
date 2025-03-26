/* ================================================================== *
 * Copyright Xialia.com  2011-2022
 * FILE : src/drumee/builtins/window/sharebox/widget/sharebox-setting/skeleton/index.js
 * TYPE : Skeleton
 * ===================================================================**/
/// <reference path="../../../../../../../../@types/index.d.ts" />

function addSettingRow(_ui_,label, itemContent, sysPn) {
  return Skeletons.Box.X({
    className  : `${_ui_.fig.family}__row-item ${sysPn}`,
    kids: [
      Skeletons.Box.X({
        className  : `${_ui_.fig.family}__legend`,
        kids: [
          Skeletons.Note({
            className   : `${_ui_.fig.family}__note`,
            content     : `${label}`
          })
        ]
      }),
      Skeletons.Box.X({
        className  : `${_ui_.fig.family}__setting-item ${sysPn}`,
        sys_pn     : `${sysPn}`,
        kids: [
          itemContent
        ]
      })
    ]
  })
}

/**
 * 
 * @param {*} _ui_
 */
function sharebox_setting_options  (_ui_) {
  let copyBtn = Skeletons.Box.X({
    className  : `${_ui_.fig.family}__classname`,
    kids: [
      Skeletons.Box.X({
        className  : `${_ui_.fig.family}__button`,
        service: 'copy-url-btn',
        uiHandler:[_ui_],
        kidsOpt: { active: 0 },
        kids: [
          Skeletons.Note({
            className  : `${_ui_.fig.family}__content`,
            content: LOCALE.COPY//"Copy"
          })
        ]
      }),
      Skeletons.Box.X({
        className   : `${_ui_.fig.family}__copy-text-wrapper`,
        sys_pn      : 'url-copy-success-text',
        dataset     : {
          state   : _a.closed
        },
        kids      : [
          Skeletons.Button.Svg({
            ico         :  "available",//"desktop_check","checkbox",//"checked",//
            className   : "icon",
          }),
          Skeletons.Note({
            className   : `${_ui_.fig.family}__copy-success`,
            content     : LOCALE.URL_COPIED,//"URL copied to clipboard",
          })
        ]
      }),  
    ]
  })
  
  let rights = Skeletons.Box.X({
    className  : `${_ui_.fig.family}__classname`,
    sys_pn    : 'permissions-setting',
    uiHandler :[_ui_],
    kids: [
      require('./permission').default(_ui_)
    ]
  })

  let none = Skeletons.Note({
    className  : `${_ui_.fig.family}__classname`,
    content: "-"
  })
  
  let a = Skeletons.Box.Y({
    className  : `${_ui_.fig.family}__setting-main`,
    debug      : __filename,
    kids       : [
      addSettingRow(_ui_, LOCALE.LINK_SHARE , copyBtn,'link-content'),//'link'
      addSettingRow(_ui_, LOCALE.PASSWORD , require('./password').default(_ui_),'password-content'),//'Password'
      addSettingRow(_ui_, LOCALE.RIGHTS , rights, 'rights-content'),//'Rights'
      addSettingRow(_ui_, LOCALE.VALID_FOR , require('./valid-until').default(_ui_),'validfor-content'),//'Valid for'
    ]
  })
  
  return a;
}

export default sharebox_setting_options