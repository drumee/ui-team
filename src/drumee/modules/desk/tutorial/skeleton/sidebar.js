const pfx = (ui) => `${ui.fig.family}__sb`;

const navItem = (ui, ico, label, service) =>
  Skeletons.Box.X({
    className: `${pfx(ui)}-item`,
    service,
    uiHandler: [ui],
    radio: 'tutorial-sidebar-radio',
    kids: [
      Skeletons.Image.Svg({ ico, className: `${pfx(ui)}-item-icon` }),
      Skeletons.Note({ className: `${pfx(ui)}-item-label`, content: label }),
    ],
  });

module.exports = function (ui) {
  const p = pfx(ui);

  return Skeletons.Box.Y({
    className: `${p}-sidebar`,
    kids: [
      // Logo
      Skeletons.Box.X({
        className: `${p}-logo`,
        kids: [
          Skeletons.Image.Svg({ ico: 'raw-logo-drumee-full', className: `${p}-logo-icon` }),
          Skeletons.Note({ className: `${p}-org-name`, content: Organization.name() || LOCALE.WORKSPACE_NAME }),
        ],
      }),

      // Nav
      Skeletons.Box.Y({
        className: `${p}-nav`,
        kids: [
          navItem(ui, 'sidebar_home', LOCALE.HOME, _e.home),
          navItem(ui, 'sidebar_notifications', LOCALE.NOTIFICATIONS, 'toggle-activity'),
          navItem(ui, 'sidebar_inbox', LOCALE.INBOX, 'toggle-inbox'),
          navItem(ui, 'sidebar_trash', LOCALE.TRASH, 'toggle-trash'),
          navItem(ui, 'sidebar_apps', LOCALE.APPS, 'toggle-apps'),
        ],
      }),

      // Workspaces
      Skeletons.Box.Y({
        className: `${p}-workspaces`,
        kids: [
          Skeletons.Note({ className: `${p}-workspaces-title`, content: LOCALE.WORKSPACES }),
          {
            kind: 'workspace_list',
            className: `${p}-workspace-list`,
            uiHandler: [ui],
          },
        ],
      }),

      // Footer
      Skeletons.Box.Y({
        className: `${p}-footer`,
        kids: [
          navItem(ui, 'sidebar_settings', LOCALE.SETTINGS, 'toggle-settings'),
          navItem(ui, 'sidebar_signout', LOCALE.SIGN_OUT, ''),
          Skeletons.Box.X({
            className: `${p}-user`,
            service: 'toggle-user-menu',
            uiHandler: [ui],
            kids: [
              Skeletons.UserProfile({
                className: `${p}-user-avatar`,
                id: Visitor.id,
                firstname: Visitor.firstname(),
                auto_color: 1,
              }),
              Skeletons.Box.Y({
                className: `${p}-user-info`,
                kids: [
                  Skeletons.Note({ className: `${p}-user-name`, content: Visitor.firstname() }),
                  Skeletons.Note({ className: `${p}-user-plan`, content: LOCALE.PRO_PLAN }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
};
