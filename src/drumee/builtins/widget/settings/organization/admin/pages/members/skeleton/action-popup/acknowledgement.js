// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/window/adminpanel/pages/members/skeleton/action-popup/acknowledgement.js
//   TYPE : Skeleton
// ===================================================================**/

function __skl_members_action_popup_acknowledgement (_ui_, data = {}) {
  const ackFig = `${_ui_.fig.family}-action-popup-acknowledgement`;
  const type = _ui_.mget('serviceType')
  
  let titleContent = LOCALE.POPUP_ACKNOWLEDGEMENT_INFORMATION//'has been informed about the change.';

  const mData = data || _ui_.mget(_a.member) || ''

  if (type == 'delete-member') {
    titleContent = LOCALE.ACCOUNT_DELETED//DELETE_MEMBER
  }

  if (type == 'delete-inactive-member') {
    titleContent = LOCALE.CONTACT_DELETED
  }

  if (type == 'remove-admin') {
    titleContent = LOCALE.REMOVE_ADMIN //'has been removed from the Admin group.'
  }

  if (type == 'reset-member-password') {
    titleContent = LOCALE.POPUP_ACKNOWLEDGEMENT_LINK//'password reset link has been sent successfully.'
  }
  
  if (type == 'block-unblock-member') {
    titleContent = LOCALE.BE_ABLE_TO_ACCESS_ACCOUNT_NOW //'has been unblocked. He/She will now be able to access their account.'
    
    if (mData.status == _a.locked) {
      titleContent = LOCALE.NOT_AUTHORIZED_TO_ACCESS_THEIR_ACCOUNT //:'has been blocked from accessing their account.'
    }
  }

  if (type == 'toggle-archive-member') {
    titleContent = LOCALE.TOGGLE_NO_ARCHIVE_MEMBER //'has been un-archived. But the member is still blocked and can be found on &#60;&#60;Members list&#62;&#62;'
    
    if (mData.status == _a.archived) {
      titleContent = LOCALE.TOGGLE_ARCHIVE_MEMBER //"has been archived and his/her profile can be accessed in &#60;&#60;Archived&#62;&#62;."
    }
  }

  if (data.status == 'INVALID_STATUS') {
    titleContent = LOCALE.TRY_AGAIN_LATER//'Something went wrong. Please try again later !'
  }

  const profileDisplay = require('./profile-display').default(_ui_);

  const title = Skeletons.Note({
    className : `${ackFig}__note message-info first-node`,
    content   : titleContent
  });  

  const button = Skeletons.Note({
    className : `${ackFig}__button-ok button clickable`,
    content   : LOCALE.OK,
    service   : 'close-overlay',
    uiHandler : _ui_
  });
  
  const a = Skeletons.Box.Y({
    debug       : __filename,
    className   : `${ackFig}__content`,
    kids        : [
      profileDisplay,
      title,
      // button
    ]
  });

  return a;
};

export default __skl_members_action_popup_acknowledgement;
