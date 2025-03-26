/* ================================================================== *
 * Copyright Xialia.com  2011-2022
 * FILE : /src/drumee/builtins/window/sharebox/widget/email-notification/skeleton/content.js
 * TYPE : Skeleton
 * ===================================================================**/
/// <reference path="../../../../../../../../@types/index.d.ts" />

/**
 * 
 * @param {*} _ui_
 */
function __skl_sharebox_widget_email_notification_content  (_ui_) {

  const contentFig = `${_ui_.fig.family}-content`;
  let bodyContent = []

  const isFileUpdate = _ui_.mget('isFileUpdate')
  const isFirstTime = _ui_.mget('isFirstTime')

  let _infoContent = LOCALE.CONFIRM_NOTIFICATION_CONTACTS_SHAREBOX
  let _cancelBtnLabel = LOCALE.CANCEL
  let _cancelBtnService = 'close-popup'
  if (isFileUpdate) {
    _infoContent = LOCALE.ADD_FILE_SEND_A_NOTIFICATION
    _cancelBtnLabel = LOCALE.NO
    _cancelBtnService = _e.close
  }

  if (isFirstTime) {
    _infoContent = LOCALE.CREATE_SHAREBOX_SEND_A_NOTIFICATION
  }

  const title = Skeletons.Box.X({
    className  : `${contentFig}__wrapper title`,
    kids       : [
      Skeletons.Note({
        className : `${contentFig}__note title`,
        content   : LOCALE.SEND_NOTIFICATION_BY_EMAIL
      })
    ]
  })

  const info = Skeletons.Box.X({
    className : `${contentFig}__wrapper info`,
    kids      : [
      Skeletons.Note({
        className  : `${contentFig}__note info`,
        content    : _infoContent
      })
    ]
  })

  const message = Skeletons.Box.X({
    className : `${contentFig}__wrapper message`,
    kids      : [
      Skeletons.EntryBox({
        className   : `${contentFig}__entry message`,
        type        : _a.textarea,
        sys_pn      : 'ref-message',
        formItem    : _a.message,
        innerClass  : _a.message,
        placeholder : LOCALE.MESSAGE,
        preselect     : 1
      })
    ]
  })

  const cancelButton = Skeletons.Box.X({
    className : `${contentFig}__buttons-wrapper`,
    service   : _cancelBtnService,
    uiHandler : _ui_,
    kidsOpt   : {
      active : 0
    },
    kids      : [
      Skeletons.Note({
        className : `${contentFig}__button-cancel`,
        content   : _cancelBtnLabel
      })
    ]
  })

  const sendButton = Skeletons.Box.X({
    className : `${contentFig}__buttons-wrapper`,
    service   : 'send-email-notification',
    uiHandler : _ui_,
    kidsOpt   : {
      active : 0
    },
    kids      : [
      Skeletons.Note({
        className : `${contentFig}__button-confirm`,
        content   : LOCALE.SEND
      })
    ]
  })

  const buttons = Skeletons.Box.X({
    className : `${contentFig}__wrapper buttons`,
    kids      : [
      cancelButton,
      sendButton
    ]
  })

  const expiredStatus = Skeletons.Box.X({
    className : `${contentFig}__expired-status-wrapper`,
    kids      : [
      Skeletons.Note({
        className  : `${contentFig}__note expired-status`,
        content    : LOCALE.SHAREBOX_VALIDITY_EXPIRE_DESC
      })
    ]
  })

  let actionWrapper = buttons;
  if (_ui_.data.dmz_expiry == _a.expired) {
    actionWrapper = expiredStatus;
  }

  bodyContent = [
    info,
    message,
    actionWrapper
  ]
  
  if( _.isEmpty(_ui_.emailData) ){
    bodyContent = [
      require('./notification-message').default(_ui_, 
        LOCALE.SHAREBOX_NO_CONTACT_AND_CREATE)
    ];
  }
  let a = Skeletons.Box.Y({
    className  : `${contentFig}__main`,
    debug      : __filename,
    kids       : [
      title,
      Skeletons.Box.Y({
        className   : `${_ui_.fig.family}__content_body`,
        sys_pn      : `email-notification-body`,
        kids        :  bodyContent
      })
    ]
  })
    
  return a;
}

export default __skl_sharebox_widget_email_notification_content