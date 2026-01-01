// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/window/adminpanel/pages/members/skeleton/action-popup/profile-display.coffee
//   TYPE : Skeleton
// ===================================================================**/

function __skl_members_action_popup_profile_display (_ui_, opt = null) {
  const data = _ui_.mget(_a.member)

  const confirmProfileFig = `${_ui_.fig.family}-action-popup`;

  const firstname = data[_a.firstname] || ''
  const lastname  = data[_a.lastname] || ''
  const fullname  = data[_a.fullname] || (firstname + ' ' + lastname)

  const profile_icon = Skeletons.UserProfile({
    className : `${confirmProfileFig}__profile avatar`,
    id        : data['drumate_id'],
    firstname,
    lastname,
    fullname
  });

  const a = Skeletons.Box.X({
    className   : `${confirmProfileFig}__wrapper profile ${opt}`,
    debug       : __filename,
    kids        : [
      profile_icon,
      
      Skeletons.Note({
        className : `${confirmProfileFig}__note fullname`,
        content   : fullname
      })
    ]
  });

  return a;
};

export default __skl_members_action_popup_profile_display;