// ================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : /src/drumee/builtins/window/addressbook/widget/contact-detail/skeleton/action-popup/profile-display.coffee
//   TYPE : Skeleton
// ===================================================================**/

const __skl_addressbook_widget_profile_display = function(_ui_) {
  let profile_icon;
  const formFig = `${_ui_.fig.family}__popup`;
  const contact = _ui_.mget(_a.contact);
  const {
    status
  } = contact;

  const displayName   = contact[_a.surname] || '';
  const firstname = contact[_a.firstname] || '';
  const lastname  = contact[_a.lastname] || '';
  const fullname  = contact[_a.fullname] || (firstname + ' ' + lastname);

  switch (status) {
    case _a.active: case _a.informed:
      profile_icon = Skeletons.UserProfile({
        className : `${formFig}__profile avatar`,
        id        : contact[_a.entity] || contact['contact_id'] || contact[_a.id],
        firstname : firstname || contact[_a.surname],
        lastname,
        fullname
      });
      break;
    case _a.memory:
      profile_icon = Skeletons.Button.Svg({
        ico       : 'desktop_drumeememo',
        className : `${formFig}__icon profile-icon ${status} desktop_drumeememo`
      });
      break;
    
    case _a.sent:
      profile_icon = Skeletons.Button.Svg({
        ico       : 'drumee_user_hourglass',//'user-help'
        className : `${formFig}__icon profile-icon ${status} user-help`
      });
      break;
    
    default:
      profile_icon = Skeletons.Button.Svg({
        ico       : 'account_contacts',
        className : `${formFig}__icon profile-icon ${status} account_contacts`
      });
  }
  
  const profileDisplay = Skeletons.Box.X({
    className   : `${formFig}__wrapper header`,
    debug       : __filename,
    kids        : [
      profile_icon,
      
      Skeletons.Note({
        className : `${formFig}__note fullname label`,
        content   : displayName
      })
    ]});

  return profileDisplay;
};

module.exports = __skl_addressbook_widget_profile_display;