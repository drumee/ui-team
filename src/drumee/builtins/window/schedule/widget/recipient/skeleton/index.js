// ===========================================================
//
// ===========================================================
const __schedule_invitation_recipient = function(_ui_, recipient) {
  // if(_.isString(recipient))
  //   email = recipient
  // else 
  let mainClassName = '';
  if (_ui_.mget(_a.mode) !== _a.readonly) {
    mainClassName = 'activehover';
  }
  let user = Skeletons.Note({
    className  : `${_ui_.fig.family}__icon guest_icon`,
    content: "@"
  });
  
  if (_ui_.mget('is_mycontact') || _ui_.mget('contact_id')) {
    if ((_ui_.mget('status') === _a.active) || (_ui_.mget('status')  === 'informed')) {
      user = { 
        kind  : KIND.profile, 
        id    : _ui_.mget(_a.id) || _ui_.mget('drumate_id'),
        email : _ui_.mget(_a.email),
        firstname : _ui_.mget(_a.firstname),
        lastname  : _ui_.mget(_a.lastname),
        sys_pn    : _a.user
      };
    } else { 
      user = Skeletons.Button.Svg({
        ico       : 'desktop_contactbook',
        className : `${_ui_.fig.family}__icon profile-icon desktop_contactbook`
      });
    }
  }
    
  let name = _ui_.mget(_a.surname) || _ui_.mget(_a.email);

  if ((_ui_.mget(_a.type) === _a.share) && (_ui_.mget(_a.status) === _a.memory)) {
    name = _ui_.mget(_a.email);
  }

  const a = Skeletons.Box.X({
    className  : `${_ui_.fig.family}__main ${mainClassName}`,
    sys_pn     : _a.container,
    debug      : __filename,
    kids:[
      Skeletons.Box.X({ 
        className  : `${_ui_.fig.family}__text`,
        kids :[
          Skeletons.Box.X({
             className  : `${_ui_.fig.family}__profile_icon`,
             kids :[user]}),
          Skeletons.Note({
            content  : name,
            className : `${_ui_.fig.family}-name`
          }),
          _ui_.mget(_a.mode) !== _a.readonly ?
            Skeletons.Box.X({
              className  : `${_ui_.fig.family}__suffix`,
              kids :[
                Skeletons.Button.Svg({
                  ico        : "desktop_delete",//account_cross" 
                  className  : `${_ui_.fig.family}-icon`,
                  nid        : _ui_.mget(_a.id),
                  uiHandler  : [_ui_],
                  service    : _e.delete
                })
              ]}) : undefined
        ]})
//      Skeletons.Button.Svg
//       ico        : "account_cross" 
//       className  : "#{_ui_.fig.family}-icon"
//       nid        : _ui_.mget(_a.id)
//       uiHandler  : [_ui_]
//        service    : _e.delete
    ]});

  return a;
};
module.exports = __schedule_invitation_recipient;
