
const __sharee_editable=function(_ui_){

  let a;
  const firstname = _ui_.mget(_a.firstname) || '';
  const lastname  = _ui_.mget(_a.lastname) || '';
  const fullname  = _ui_.mget(_a.fullname) || (firstname + ' ' + lastname);
  
  const avatar = Skeletons.UserProfile({
    className : `${_ui_.fig.family}__profile avatar`,
    id        : _ui_.mget(_a.id),
    firstname : firstname || _ui_.mget(_a.surname),
    lastname,
    fullname,
    online    : _ui_.mget(_a.online)
  });

  const user = Skeletons.Box.X({
    className : `${_ui_.fig.family}__container`,
    service   : "select-contact",
    debug     : __filename,
    kids: [
      avatar, 
      Skeletons.Note({
        active    : 0,
        content   :  _ui_.mget(_a.surname) || _ui_.name,
        className : `${_ui_.fig.family}__label`
      }),
      
      Skeletons.Button.Svg({
        ico        : "desktop__cog",
        className  : `${_ui_.fig.family}__icon settings`, 
        service    : _e.view,
        state      : 0,
        dataset    : {
          editable : _ui_.editable
        },
        uiHandler  : _ui_
      })

      // TEMP DISABLED
      // Skeletons.Button.Svg
      //   ico        : "desktop_contacts"
      //   className  : "#{_ui_.fig.family}__icon settings", 
      //   service    : "peer-folder"
      //   state      : 0
      //   uiHandler  : _ui_

      // Skeletons.Button.Svg
      //   ico        : "desktop_delete"
      //   className  : "#{_ui_.fig.family}__icon delete"
      //   service    : _a.remove
      //   dataset    :
      //     editable : _ui_.editable
      //   uiHandler      : _ui_
    ]});

  const media = _ui_.mget(_a.media);
  if ((media == null) || !(media.mget(_a.privilege) &_K.permission.admin)) {
    user.kids.pop();    
  }
  return a = [
    user,
    Skeletons.Box.Y({
      className : "",
      sys_pn    : "options-content",
      active    : 0,
      wrapper   : 1
    })
  ];
};
module.exports = __sharee_editable;
