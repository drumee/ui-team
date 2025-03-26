// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : ../src/drumee/builtins/window/addressbook/widget/contact-detail/skeleton/invite
//   TYPE :
// ==================================================================== *

const __skl_contact_detail_invite = function(_ui_) {
  // @debug _ui_, contact

  const contact = _ui_.mget(_a.contact);
  const contactFig = `${_ui_.fig.family}`;

  const firstname = contact[_a.firstname] || '';
  const lastname  = contact[_a.lastname] || '';
  const fullname  = contact[_a.fullname] || (firstname + ' ' + lastname);

  const profile_icon = Skeletons.UserProfile({
    className : `${contactFig}__profile avatar`,
    id        : contact['contact_id'] || contact[_a.id],
    firstname : firstname || contact[_a.surname],
    lastname,
    fullname
  });

  const header = Skeletons.Box.X({
    className   : `${contactFig}__wrapper header invite-header`,
    kids        : [
      Skeletons.Box.X({
        className : `${contactFig}__profile-wrapper`,
        kids      : [
          profile_icon,

          Skeletons.Note({
            className : `${contactFig}__note fullname label selectable-text`,
            content   : contact[_a.surname],
            escapeContextmenu : true
          })
        ]})
    ]});

  const separator = Skeletons.Box.X({
    className : `${contactFig}__separator`});

  const message = Skeletons.Box.X({
    className   : `${contactFig}__wrapper message`,
    kids        : [
      Skeletons.Note({
        className   : `${contactFig}__note message`,
        content     : LOCALE.NOT_CONTACT_INVITE
      }) //'Is not in your contact book. Invite him'
    ]});
  
  const surName = Skeletons.Box.X({
    className   : `${contactFig}__wrapper surname`,
    kids        : [
      Skeletons.Button.Svg({
        ico         : 'account_name',
        className   : `${contactFig}__icon surname`
      }),
      
      Skeletons.Entry({
        className   : `${contactFig}__entry surname`,
        formItem    : _a.surname,
        name        : _a.surname,
        placeholder : LOCALE.SURNAME
      }) //_a.surname
    ]});

  const comment = Skeletons.Box.X({
    className   : `${contactFig}__wrapper comment`,
    kids        : [
      Skeletons.Entry({
        className     : `${contactFig}__entry comment`,
        type          : _a.textarea,
        name          : _a.comment,
        formItem      : _a.comment,
        innerClass    : _a.comment,
        placeholder   : LOCALE.YOUR_MSG || ''
      })
    ]});

  const notifierWrapper =  Skeletons.Wrapper.Y({
    className : `${contactFig}__wrapper notifier`,
    name      : "notifierBox"
  });

  const buttons = Skeletons.Box.X({
    className   : `${contactFig}__wrapper buttons`,
    kids        : [
      Preset.ConfirmButtons(_ui_, {
        confirmLabel  : 'Invite',
        cancelService : 'cancel-invite',
      },{
        sys_pn    : 'invite-button',
        service   : 'invite-contact',
        uiHandler : _ui_,
        state     : 1
      })
    ]});

  const a = Skeletons.Box.Y({
    className   : `${contactFig}__container`,
    debug       : __filename,
    kids        : [
      header,
      separator,
      
      Skeletons.Box.Y({
        className   : `${contactFig}__invite`,
        kids        : [
          message,
          surName,
          comment,
          notifierWrapper,
          buttons
        ]})
    ]});
  
  return a;
};


module.exports = __skl_contact_detail_invite;
