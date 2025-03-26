// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/window/addressbook/widget/invite-notification/skeleton/static-text.coffee
//   TYPE : Skelton
// ===================================================================**/

// ===========================================================
//
// ===========================================================
const __skl_widget_invite_notification_static_text = function(_ui_, status) {
  const inviteFig = _ui_.fig.family;

  let content  = LOCALE.STATIC_ADD_CONTACT_LIST;
  const content1 = '';
  if (status === "informed") {
    content  = LOCALE.STATIC_ACCEPTED_LIST;
  }

  const staticText = Skeletons.Box.Y({
    debug      : __filename,
    className   : `${inviteFig}__static-text`,
    kids        : [
      Skeletons.Note({
        className : `${inviteFig}__note static-text ${status}`,
        content
      }),
      
      Skeletons.Note({
        className : `${inviteFig}__note static-text ${status}`,
        content   : content1
      })
    ]});
  
  return staticText;
};

module.exports = __skl_widget_invite_notification_static_text;