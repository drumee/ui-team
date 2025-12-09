
module.exports = function(ui, opt){
  let profile_icon;
  const prefix = ui.fig.family;
  const fname = ui.mget(_a.firstname)  || '';
  const lname = ui.mget(_a.lastname)  || '';
  const fullname = ui.mget(_a.fullname) || (fname  + " " + lname);
  const displayName = ui.mget(_a.surname) || ui.mget('display');
  const type = ui.mget(_a.type);

  if (ui.mget('is_drumate')) {
    profile_icon = Skeletons.UserProfile({
      className   : `${prefix}__avatar`,
      id          : ui.mget(_a.entity) || ui.mget(_a.id) || ui.mget('drumate_id'),
      firstname   : fname || displayName,
      lastname    : lname,
      fullname,
      online      : ui.mget(_a.online),
      live_status  : 1
    });
  } else { 
    profile_icon = Skeletons.Button.Svg({
      ico       : 'desktop_contactbook',
      className : `${prefix}__icon profile-icon desktop_contactbook`
    });
  }

  return Skeletons.Box.X({
    className : `${prefix}__main ${type}`,
    debug     : __filename,
    uiHandler : ui,
    service   : "add-item",
    kids: [   
      profile_icon,
      Skeletons.Note({
        active    : 0,
        content   : ui.name,
        active      : 0,
        className : `${prefix}__label ${type}`
      })
    ]
  });
};;
