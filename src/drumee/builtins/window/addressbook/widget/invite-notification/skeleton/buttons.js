// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/window/addressbook/widget/invite-notification/skeleton/buttons.coffee
//   TYPE : Skelton
// ===================================================================**/

// ===========================================================
//
// ===========================================================
const __skl_widget_invite_notification_buttons = function(_ui_, status) {
  const inviteFig = _ui_.fig.family;

  let buttons = Preset.ConfirmButtons(_ui_, {
      confirmLabel  : LOCALE.ACCEPT || 'Accept',
      cancelLabel   : LOCALE.REFUSE || 'Refuse'
    });

  if (status === "informed") {
    buttons = Skeletons.Box.X({
      debug      : __filename,
      className : `${inviteFig}__buttons-wrapper buttons ${status} u-ai-center`,
      kids      : [
        Skeletons.Note({
          className : `${inviteFig}__button-confirm clickable ${status}`,
          content   : 'Ok',
          service   : 'accept-informed',
          uiHandler : _ui_
        }) 
      ]});
  }
  

  return buttons;
};

module.exports = __skl_widget_invite_notification_buttons;