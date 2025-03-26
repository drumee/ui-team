// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/window/bigchat/widget/shareroom-user-item/skeleton/index.coffee
//   TYPE : Skelton
// ===================================================================**/

// ===========================================================
//
// ===========================================================
const __skl_shareroom_userItem = function(_ui_) {
  const contentFig = _ui_.fig.family;
  
  const fname = _ui_.mget(_a.firstname)  || '';
  const lname = _ui_.mget(_a.lastname)  || '';
  const fullname = _ui_.mget(_a.fullname) || (fname  + " " + lname);
  const displayName = _ui_.mget(_a.surname);

  const profile_icon = Skeletons.UserProfile({
    className : `${contentFig}__profile`,
    id        : _ui_.mget(_a.id),
    firstname : fname,
    lastname  : lname,
    fullname
  });
  
  const name = Skeletons.Note({
    className : `${contentFig}__name`,
    content   : displayName
  });
  
  let role ='';
  if (_ui_.mget(_a.privilege) === _K.privilege.admin) {
    role = LOCALE.ADMINISTRATOR;//'Admin'
  }
  
  if (_ui_.mget(_a.privilege) === _K.privilege.owner) {
    role = LOCALE.OWNER;// 'owner'
  }
  
  role = Skeletons.Note({
    className : `${contentFig}__role`,
    content   : role
  }); 

  const a = Skeletons.Box.Y({
    className  : `${_ui_.fig.family}__main`,
    debug      : __filename,
    kids       : [
      Skeletons.Box.X({
        className  : `${_ui_.fig.family}__container`,
        kids : [
          profile_icon,
          name,
          role
        ]})
    ]});

  return a;
};
module.exports = __skl_shareroom_userItem;