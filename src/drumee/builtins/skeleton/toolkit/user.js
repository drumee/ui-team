
function menu_items(ui) {
  const pfx = `${ui.fig.family}-topbar__user-menu`;
  return Skeletons.Box.Y({
    debug: __filename,
    className: `${pfx}__items`,
    flow: _a.vertical,
    kids: [
      Skeletons.Button.Label({
        ico: 'desktop_account--white',
        className: `${pfx}-item account`,
        label: LOCALE.MY_ACCOUNT,
        service: "settings-account"
      }),
      Visitor.domainCan(_K.permission.admin_view) ?
        Skeletons.Button.Label({
          ico: 'user-settings',
          className: `${pfx}-item admin-panel`,
          label: LOCALE.ADMIN,
          service: _e.launch,
          respawn: 'window_adminpanel'
        }) : undefined,
      Skeletons.Button.Label({
        ico: 'desktop_questionmark',
        className: `${pfx}-item helpdesk`,
        label: LOCALE.HELPDESK,
        service: 'open-user-guide',
        // respawn: 'settings_helpcenter'
      }),
      Skeletons.Button.Label({
        ico: 'desktop_disconnect',
        className: `${pfx}-item disconnect`,
        label: LOCALE.DISCONNECT,
        on_click: Butler.logout
      })
    ]
  });
};

/**
 * 
 * @param {*} ui 
 * @returns 
 */
export function userMenu(ui, sys_pn) {
  const pfx = `${ui.fig.family}-topbar__user-menu`;
  const trigger = Skeletons.Box.X({
    className: `${pfx}-trigger`,
    kidsOpt: { active: 0 },
    kids: [
      Skeletons.UserProfile({ auto_color: 0, sys_pn }),
      Skeletons.Element({
        className: `${pfx}-username`,
        content: Visitor.firstname()
      }),
      Skeletons.Button.Svg({ className: `${pfx}-trigger-icon`, ico: "carret-down" }),
    ]
  });

  return Skeletons.Box.X({
    className: `${pfx}-container`,
    debug: __filename,
    kids: [
      {
        kind: KIND.menu.topic,
        className: `${pfx}-content`,
        flow: _a.y,
        opening: _e.click,
        service: "user-menu",
        sys_pn: "user-dropdown",
        persistence: _a.once,
        trigger,
        items: menu_items(ui),
        offsetY: 20
      }
    ]
  });

};
