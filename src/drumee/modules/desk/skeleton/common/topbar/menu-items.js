// ===========================================================
// _menu_items
// ===========================================================

const __desk_toppar_dropdown = function(_ui_) {
  const pfx = "desk-topbar__dropdown-item";
  //pfx = "#{_ui_.fig.family}"
  const a = SKL_Box_V(_ui_, {
    className: "c-top-bar__menu-group",
    className: "c-top-bar__menu-inner",
    styleOpt: {
      width: 174
    },
    flow: _a.vertical,
    kids: [
      Skeletons.Button.Label({
        ico: "desktop_account--white",
        className: `${pfx}`,
        label: LOCALE.MY_ACCOUNT,
        service: "open-account",
        href: _K.module.account
      }),
      Skeletons.Button.Label({
        ico: "desktop_contact",
        className: `${pfx}`,
        service: null,
        value: null,
        label: LOCALE.CONTACTS,
        href: "#/desk/addressbook"
      }),
      Skeletons.Button.Label({
        ico: "desktop_calendar",
        className: `${pfx}__tbd `,
        service: null,
        value: null,
        label: LOCALE.AGENDA,
        tooltips  : {
          className : `${pfx}__tbd`,
          content : LOCALE.COMING_SOON
        }
      }),
      Skeletons.Button.Label({
        ico: "desktop_chatmail",
        className: `${pfx}`,
        service: null,
        value: null,
        label: "Chatmail", //LOCALE.
        href: "#/desk/chat"
      }),
      Skeletons.Button.Label({
        ico: "desktop_disconnect",
        className:`${pfx}`,
        on_click: Butler.logout,
        label: LOCALE.DISCONNECT //"Disconnect"
      })
    ]
  });
  return a;
};

module.exports = __desk_toppar_dropdown;
