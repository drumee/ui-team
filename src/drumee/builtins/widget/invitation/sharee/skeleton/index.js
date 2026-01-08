
const __sharee_editable = function (ui) {

  let a;
  const firstname = ui.mget(_a.firstname) || '';
  const lastname = ui.mget(_a.lastname) || '';
  const fullname = ui.mget(_a.fullname) || (firstname + ' ' + lastname);

  const avatar = Skeletons.UserProfile({
    className: `${ui.fig.family}__profile avatar`,
    id: ui.mget(_a.id),
    firstname: firstname || ui.mget(_a.surname),
    lastname,
    fullname,
    online: ui.mget(_a.online)
  });

  const user = Skeletons.Box.X({
    className: `${ui.fig.family}__container`,
    service: "select-contact",
    debug: __filename,
    kids: [
      avatar,
      Skeletons.Note({
        active: 0,
        content: ui.mget(_a.surname) || ui.name,
        className: `${ui.fig.family}__label`
      }),

      Skeletons.Button.Svg({
        ico: "desktop__cog",
        className: `${ui.fig.family}__icon settings`,
        service: _e.view,
        state: 0,
        dataset: {
          editable: ui.editable
        },
        uiHandler: ui
      })

      // TEMP DISABLED
      // Skeletons.Button.Svg
      //   ico        : "desktop_contacts"
      //   className  : "#{ui.fig.family}__icon settings", 
      //   service    : "peer-folder"
      //   state      : 0
      //   uiHandler  : ui

      // Skeletons.Button.Svg
      //   ico        : "desktop_delete"
      //   className  : "#{ui.fig.family}__icon delete"
      //   service    : _a.remove
      //   dataset    :
      //     editable : ui.editable
      //   uiHandler      : ui
    ]
  });

  const media = ui.mget(_a.media);
  if ((media == null) || !(media.mget(_a.privilege) & _K.permission.admin)) {
    user.kids.pop();
  }

  return Skeletons.Box.Y({
    debug: __filename,
    className: `${ui.fig.family}__main`,
    kids: [
      user,
      Skeletons.Wrapper.Y({
        className: "",
        sys_pn: "options-content",
        active: 0,
        wrapper: 1
      })
    ]
  })
};
module.exports = __sharee_editable;
