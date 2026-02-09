const __skl_contact_item = function (ui) {

  let profile_icon;
  const fname = ui.mget(_a.firstname) || '';
  const lname = ui.mget(_a.lastname) || '';
  const fullname = ui.mget(_a.fullname) || (fname + " " + lname);
  const displayName = ui.mget(_a.surname) || ui.mget('display');

  const contentFig = ui.fig.family;

  if (ui.mget('flag') === 'share') {
    profile_icon = Skeletons.Button.Svg({
      ico: 'raw-drumee_projectroom',
      className: `${contentFig}__icon raw-drumee_projectroom`
    });
  } else {
    const status = ui.mget('status');
    switch (status) {
      case _a.active: 
      case _a.informed:
        profile_icon = Skeletons.UserProfile({
          className: `${contentFig}__profile`,
          id: ui.mget(_a.entity) || ui.mget(_a.id) || ui.mget('drumate_id'),
          firstname: fname || displayName,
          lastname: lname,
          fullname,
          auto_color: 1,
          online: ui.mget(_a.online),
          live_status: 1
        });
        break;
      case _a.memory:
        profile_icon = Skeletons.Button.Svg({
          ico: 'desktop_drumeememo',
          className: `${contentFig}__icon profile-icon ${status} desktop_drumeememo`
        });
        break;
      case _a.sent:
        profile_icon = Skeletons.Button.Svg({
          ico: 'drumee_user_hourglass',//'user-help'
          className: `${contentFig}__icon profile-icon ${status} user-help`
        });
        break;
      default:
        profile_icon = Skeletons.Button.Svg({
          ico: 'account_contacts',
          className: `${contentFig}__icon profile-icon ${status} account_contacts`
        });
    }
  }

  const name = Skeletons.Note({
    className: `${contentFig}__name`,
    content: displayName
  });

  const a = Skeletons.Box.Y({
    className: `${contentFig}__main`,
    debug: __filename,
    kids: [
      Skeletons.Box.X({
        className: `${contentFig}__container`,
        kids: [
          profile_icon,
          name
        ]
      })
    ]
  });

  return a;
};

module.exports = __skl_contact_item;