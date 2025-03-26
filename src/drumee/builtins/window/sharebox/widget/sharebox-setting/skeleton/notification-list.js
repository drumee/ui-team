/* ================================================================== *
 * Copyright Xialia.com  2011-2022
 * FILE : src/drumee/builtins/window/sharebox/widget/sharebox-setting/skeleton/index.js
 * TYPE : Skeleton
 * ===================================================================**/
/// <reference path="../../../../../../../../@types/index.d.ts" />

/**
 * 
 * @param {*} _ui_
 */
function sharebox_setting_options  (_ui_) {
  let footer = null;
  if (_ui_.notificationMode != _a.edit){
    footer = [Skeletons.Note({
      className   : `${_ui_.fig.family}__action-button add`,
      service     : 'edit-notification-list',
      content     : LOCALE.MODIFY_LIST//"Modify Contacts"
    })]
  }else{
    footer = [
      Skeletons.Note({
        className   : `${_ui_.fig.family}__action-button cancel`,
        service     : 'cancel-notification-list',
        content     : LOCALE.CANCEL //OK //"Save Contacts"
      }),
      Skeletons.Note({
        className   : `${_ui_.fig.family}__action-button save`,
        service     : 'save-notification-list',
        content     : LOCALE.SAVE //OK //"Save Contacts"
      })
    ]
  }
  
  const media = _ui_.mget(_a.media);

  let a = Skeletons.Box.Y({
    className  : `${_ui_.fig.family}__notification-main`,
    debug      : __filename,
    kids       : [
      Skeletons.Box.X({
        className  : `${_ui_.fig.family}__notification-title`,
        kids: [
          Skeletons.Note({
            className   : `${_ui_.fig.family}__note`,
            content     : LOCALE.ACCESS_LIST //LIST_OF_DESTINATORS//NOTIFICATION_LIST//"Notification list"
          })
        ] 
      }),
      Skeletons.Box.X({
        className  : `${_ui_.fig.family}__notifications_list-wrapper`,
        kids: [
          {
            kind          : 'widget_simple_invitation',
            selectedEmail : _ui_.formData.email || [],
            sys_pn        : 'widget_invitation-email',
            uiHandler     : [_ui_],
            preselect     : 1,
            mode          : _ui_.notificationMode || _a.readonly,
            type          : media.mget(_a.area)

            // onAddUser     : _ui_.onAddUser.bind(_ui_),
            // onDeleteUser  : _ui_.onDeleteUser.bind(_ui_),
          }
        ]
      }),
      Skeletons.Box.X({
        className  : `${_ui_.fig.family}__notification-footer`,
        kids: footer
      })

    ]
  })
  
  return a;
}

export default sharebox_setting_options