// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/window/adminpanel/pages/members/skeleton/action-popup/member-acknowledgement.js
//   TYPE : Skeleton
// ===================================================================**/

function __skl_members_action_popup_member_acknowledgement (_ui_) {
  const ackFig = `${_ui_.fig.family}-member-acknowledgement`;
  
  const close = Skeletons.Box.X({
    className   : `${ackFig}__close`,
    kids        : [
      Skeletons.Button.Svg({
        ico         : 'account_cross',
        className   : `${ackFig}__icon close account_cross`,
        service     : 'close-overlay',
        uiHandler   : _ui_
      })
    ]
  });

  const successIcon = Skeletons.Button.Svg({
    ico       : 'editbox_checkmark',
    className : `${ackFig}__icon success green big`
  })

  const content = Skeletons.Note({
    className : `${ackFig}__note message-info`,
    content   :LOCALE.MEMBER_CREATED_SUCCESSFULLY// 'Member has been created successfully !'
  });

  const subContent = Skeletons.Note({
    className : `${ackFig}__note message-info`,
    content   : LOCALE.RECEIVE_VERIFICATION_EMAIL//'He/She will receive verification email.'
  });

  const button = Skeletons.Note({
    className : `${ackFig}__button-ok button clickable`,
    content   : LOCALE.OK,
    service   : 'close-overlay',
    uiHandler : _ui_
  });
  
  const a = Skeletons.Box.Y({
    debug       : __filename,
    className   : `${ackFig}__main`,
    kids        : [
      close,
      successIcon,
      content,
      subContent,
      button
    ]
  });

  return a;
};

export default __skl_members_action_popup_member_acknowledgement;
