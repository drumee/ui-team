// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/window/addressbook/widget/contact-item/skeleton/index.coffee
//   TYPE : Skelton
// ===================================================================**/

// ===========================================================
//
// ===========================================================
const __skl_contact_item = function(_ui_) {

  let profile_icon;
  const fname = _ui_.mget(_a.firstname)  || '';
  const lname = _ui_.mget(_a.lastname)  || '';
  const fullname = _ui_.mget(_a.fullname) || (fname  + " " + lname);
  const displayName = _ui_.mget(_a.surname) || _ui_.mget('display');
  
  const contentFig = _ui_.fig.family;

  if (_ui_.mget('flag') === 'share') {
    profile_icon =  Skeletons.Button.Svg({
      ico       : 'raw-drumee_projectroom',
      className : `${contentFig}__icon raw-drumee_projectroom`
    });
  } else {
    const status = _ui_.mget('status');
    if ((status === _a.active) || (status === 'informed')) {
      profile_icon = Skeletons.UserProfile({
        className   : `${contentFig}__profile`,
        id          : _ui_.mget(_a.entity) || _ui_.mget(_a.id) || _ui_.mget('drumate_id'),
        firstname   : fname || displayName,
        lastname    : lname,
        fullname,
        online      : _ui_.mget(_a.online),
        live_status  : 1
      });
    } else { 
      profile_icon = Skeletons.Button.Svg({
        ico       : 'desktop_contactbook',
        className : `${contentFig}__icon profile-icon desktop_contactbook`
      });
    }
  }


  const name = Skeletons.Note({
    className : `${contentFig}__name`,
    content   : displayName
  });

  const a = Skeletons.Box.Y({
    className  : `${contentFig}__main`,
    debug      : __filename,
    kids       : [
      Skeletons.Box.X({
        className  : `${contentFig}__container`,
        kids : [
          profile_icon,
          name
        ]})
    ]});

  return a;
};

export default __skl_contact_item;