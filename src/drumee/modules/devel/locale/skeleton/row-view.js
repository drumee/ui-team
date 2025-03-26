
const { dayOfTime } = require("core/utils")
const __locale_row_view = function(view, ext) { 
  let updated_at;
  const access_icon_options = {
    width   : 17,
    height  : 17,
    padding : 0
  };
  
  const action_icon_options = {
    width   : 20,
    height  : 20,
    padding : 0,
    cursor  : "pointer"
  };
  //_dbg "HHHHHHHHHH", view, ext

  const icon = ext.icon || "common_placeholder";
  const name = ext.firstname + " " + ext.lastname;
  const pfx = "admin-locale";
  const created_at = dayOfTime(ext.ctime, "DD-MM-YY");
  if (ext.utime != null) {
    updated_at = dayOfTime(ext.utime, "DD-MM-YY");
  } else {
   updated_at = "---";
 }

  const state = view.get(_a.state);

  const a = Skeletons.Box.X({
    className: `${pfx}__row`,
    initialState: 0,
    debug : __filename,
    state: 0,
    kids: [
      Skeletons.Entry({
        className: `${pfx}__column`,
        value: ext.key_code,
        name: "key_code"
      }),
      Skeletons.Entry({
        className: `${pfx}__column`,
        value: ext.en,
        name: "en"
      }),
      Skeletons.Entry({
        className: `${pfx}__column`,
        value: ext.fr,
        name: "fr"
      }),
      Skeletons.Entry({
        className: `${pfx}__column`,
        value: ext.ru,
        name: "ru"
      }),
      Skeletons.Entry({
        className: `${pfx}__column`,
        value: ext.zh,
        name: "zh"
      }),
      Skeletons.Box.X({
        className: `${pfx}__column`,
        kids:[
          Skeletons.Button.Icon({
            ico:"editbox_pencil", 
            className: "mr-10 u-as-center auth-people__action-icon",
            bubble   : 1,
            signal: _e.ui.event,
            service : "edit-row",
            data    : ext,
            uiHandler : view.getHandlers(_a.ui)
          }, action_icon_options),
          Skeletons.Button.Icon({
            ico:"desktop_delete", 
            className : "u-as-center auth-people__action-icon",
            service   : "delete-key",
            name      : ext.key_code,
            id        : ext.id 
          }, {
            width: 14,
            height: 14,
            padding: 0
          })
        ]
      })
    ]
  });
  return a;
};
module.exports = __locale_row_view;
