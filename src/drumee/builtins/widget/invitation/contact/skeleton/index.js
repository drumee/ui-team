/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : desk/contact/skeleton/name/checkbox+label
//   TYPE : Skelton
// ==================================================================== *

const __recipient_avatar_cb=function(_ui_, opt){
  let profile_icon;
  if (opt == null) { opt = "selection"; }
  const prefix = _ui_.fig.family;
  const fname = _ui_.mget(_a.firstname)  || '';
  const lname = _ui_.mget(_a.lastname)  || '';
  const fullname = _ui_.mget(_a.fullname) || (fname  + " " + lname);
  const displayName = _ui_.mget(_a.surname) || _ui_.mget('display');
  const type = _ui_.mget(_a.type);
  if (_ui_.mget('is_drumate')) {
    profile_icon = Skeletons.UserProfile({
      className   : `${prefix}__avatar`, //"#{contentFig}__profile"
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
      className : `${prefix}__icon profile-icon desktop_contactbook`
    });
  }

  const a = Skeletons.Box.X({
    className : `${prefix}__main ${type}`,
    debug     : __filename,
    uiHandler : _ui_,
    service   : "add-item",
    kids: [   
      profile_icon,
      Skeletons.Note({
        active    : 0,
        content   : _ui_.name,
        active      : 0,
        className : `${prefix}__label ${type}`
      })
    ]
  });
  if (type === 'selection') {
    a.kids.push(Skeletons.Button.Svg({
      ico           : "desktop_check",
      state         : _ui_.mget(_a.state),
      uiHandler     : _ui_,
      labelClass    : "text",
      reference     : _a.state,
      service       : _e.select,
      className : `${prefix}__checkbox u-fd-row`
    })
    );
  } else { 
    let service = _e.remove;
    if (_ui_.mget(_a.idle)) {
      var cn = `${cn} idle`;
      service = 'revoke';
    }

    a.kids.push(Skeletons.Button.Svg({
      ico           : "account_cross",
      uiHandler     : _ui_,
      labelClass    : "text",
      service,
      className : `${prefix}__icon ${type}` 
    })
    );
  }

  return a;
};
module.exports = __recipient_avatar_cb;
