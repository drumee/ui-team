// ==================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : builins/window/contact/skeleton/acknowledge
//   TYPE : Skeleton
// ==================================================================== *

const __skl_window_contact_acknowledge = function(_ui_) {
  this.debug("__skl_window_contact_acknowledge", _ui_);
  
  const ackFig = _ui_.fig.family;
  const data = _ui_.source;

  const emailOrIdent = data.input || '';

  const buttons = Skeletons.Box.X({
    className   : `${ackFig}__wrapper buttons-wrapper`,
    kids        : [
      Preset.ConfirmButtons(_ui_, {
        cancelLabel   : LOCALE.CLOSE, //'Close',
        cancelService : 'close-invite',
        confirmLabel  : LOCALE.INVITE_OTHERS //'Invite Others',
      },{
        sys_pn    : 'submit-button',
        service   : 'invite-others',
        uiHandler : _ui_
      })
    ]});

  const acknowledge = Skeletons.Box.Y({
    className  : `${ackFig}__container contact-acknowledge`,
    kids       : [
      Skeletons.Box.X({
        className : 'acknowledge-box icon',
        kids  : [
          Skeletons.Button.Svg({
            className : `${ackFig}__icon icon_success green big`,
            ico       : 'editbox_checkmark'
          })
        ]}),
      
      Skeletons.Box.X({
        className : 'acknowledge-box',
        kids  : [
          Skeletons.Note({
            className   : `${ackFig}__note note_content`,
            content     : LOCALE.INVITATION_MAIL_SENT
          })
        ]}),
      
      Skeletons.Box.X({
        className : 'acknowledge-box',
        kids  : [
          Skeletons.Note({
            content    : emailOrIdent,
            className   : `${ackFig}__note input-content`
          })
        ]})

    //  Skeletons.Box.X
      //  className : 'acknowledge-box'
      //  kids  : [
        //  Skeletons.Note
          //  className : "#{ackFig}__note"
          //  content   : LOCALE.LISTED_CONTACT_LIST
      //  ]
    ]});

  const a = Skeletons.Box.Y({
    className  : `${ackFig}__main`,
    debug      : __filename,
    kids       : [
      acknowledge,
      buttons
    ]});
  
  return a; 
};

module.exports = __skl_window_contact_acknowledge;
