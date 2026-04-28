const { userMenu } = require("../../../builtins/skeleton/toolkit/user");

/**
 * Sidebar module (refactored)
 */

// ---------- Helpers ----------
const getSidebarFig = (ui) => `${ui.fig.family}-sidebar`;

const cls = (fig, suffix) => `${fig}__${suffix}`;

const createText = (fig, suffix, content) =>
  Skeletons.Note({ className: cls(fig, suffix), content, active: 0 });

// ---------- Nav Item ----------
const createNavItem = (
  ui,
  ico,
  label,
  service = "",
  color = "",
  on_click,
  sys_pn,
) => {
  const fig = `${ui.fig.family}-sidebar`;

  return Skeletons.Box.X({
    className: cls(fig, "item"),
    uiHandler: [ui],
    radio: `sidebar-radio`,
    service,
    on_click,
    sys_pn,
    kidsOpt: {
      active: 0,
    },
    kids: [
      Skeletons.Button.Svg({
        ico,
        className: cls(fig, `item-icon ${color}`),
      }),
      createText(fig, `item-text ${color}`, label),
    ],
  });
};

// ---------- Workspace Section ----------
const createWorkspaceSection = (ui) => {
  const fig = getSidebarFig(ui);

  return Skeletons.Box.Y({
    className: cls(fig, "workspace"),
    kids: [
      createText(fig, "workspace-title", LOCALE.WORKSPACES),
      {
        kind: "workspace_list",
        className: cls(fig, "workspace-main"),
        uiHandler: [ui],
      },
    ],
  });
};

// ---------- Footer ----------
const getInitials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

const getThemeIcon = () => {
  const theme =
    document.documentElement.dataset.theme ||
    (Visitor.wallpaper() || {}).theme ||
    (() => {
      try {
        return localStorage.getItem("drumee.theme");
      } catch {
        return null;
      }
    })() ||
    "light";
  return theme === "dark" ? "raw-light" : "raw-dark";
};

const createFooter = (ui, username) => {
  const fig = getSidebarFig(ui);

  return Skeletons.Box.Y({
    className: cls(fig, "footer"),
    kids: [
      createNavItem(ui, "sidebar_settings", LOCALE.SETTINGS, "toggle-settings"),
      createNavItem(
        ui,
        getThemeIcon(),
        LOCALE.DISPLAY_MODE,
        "toggle-theme",
        "",
        undefined,
        "theme-toggle",
      ),
      createNavItem(
        ui,
        "sidebar_signout",
        LOCALE.SIGN_OUT,
        "",
        "red",
        Butler.logout,
      ),
      // userMenu(ui)
      // Skeletons.UserProfile({ auto_color:1, oneLetter:1, className: cls(fig, "footer-user-btn") }),
      Skeletons.Box.Y({
        className: cls(fig, "footer-user-wrapper"),
        sys_pn: "user-menu-anchor",
        partHandler: ui,
        kidsOpt: { active: 0 },
        kids: [
          Skeletons.Box.X({
            className: cls(fig, "footer-user-btn"),
            sys_pn: "user-menu-trigger",
            partHandler: ui,
            service: "toggle-user-menu",
            uiHandler: [ui],
            kidsOpt: { active: 0 },
            kids: [
              Skeletons.Box.X({
                className: cls(fig, "footer-avatar"),
                kidsOpt: { active: 0 },
                kids: [
                  createText(fig, "footer-avatar-note", getInitials(username)),
                ],
              }),
              Skeletons.Box.Y({
                className: cls(fig, "footer-name-wrapper"),
                kidsOpt: { active: 0 },
                kids: [
                  createText(fig, "footer-username", username),
                  createText(fig, "footer-user-plan", LOCALE.PRO_PLAN),
                ],
              }),
            ],
          }),
          Skeletons.Box.Y({
            className: cls(fig, "footer-user-menu"),
            sys_pn: "user-menu-items",
            partHandler: ui,
            dataset: { state: "closed" },
            kidsOpt: {
              active: 0,
            },
            kids: [
              Skeletons.Box.X({
                className: `${cls(fig, "footer-user-menu-item")} account`,
                service: "open-account",
                uiHandler: [ui],
                kidsOpt: {
                  active: 0,
                },
                kids: [
                  Skeletons.Image.Svg({
                    ico: "desktop_account--white",
                    className: cls(fig, "footer-user-menu-icon"),
                  }),
                  createText(fig, "footer-user-menu-label", LOCALE.MY_ACCOUNT || "My account"),
                ],
              }),
              Skeletons.Box.X({
                className: `${cls(fig, "footer-user-menu-item")} helpdesk`,
                service: _a.helpdesk,
                uiHandler: [ui],
                kidsOpt: {
                  active: 0,
                },
                kids: [
                  Skeletons.Image.Svg({
                    ico: "desktop_questionmark",
                    className: cls(fig, "footer-user-menu-icon"),
                  }),
                  createText(fig, "footer-user-menu-label", LOCALE.HELPDESK || "Helpdesk"),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
};

// ---------- Navigation ----------
const createNav = (ui) => {
  const fig = getSidebarFig(ui);

  return Skeletons.Box.Y({
    className: `${fig}__nav`,

    kids: [
      Skeletons.Box.Y({
        className: `${fig}__logo`,
        kids: [
          Skeletons.Button.Svg({
            ico: "raw-logo-drumee-full",
            className: `${fig}__logo-icon`,
          }),
          createText(fig, "header", Organization.name() || LOCALE.WORKSPACE_NAME),
        ],
      }),

      Skeletons.Box.Y({
        className: `${fig}__nav-main`,
        kids: [
          createNavItem(ui, "sidebar_home", LOCALE.HOME, _e.home, "", null, "sidebar-home"),
          createNavItem(
            ui,
            "sidebar_notifications",
            LOCALE.NOTIFICATIONS,
            "toggle-activity",
          ),
          createNavItem(ui, "sidebar_inbox", LOCALE.INBOX, "toggle-inbox"),
          createNavItem(ui, "sidebar_trash", LOCALE.TRASH, "toggle-trash"),
          createNavItem(ui, "sidebar_apps", LOCALE.APPS, "toggle-apps"),
        ],
      }),

      createWorkspaceSection(ui),
    ],
  });
};

// ---------- Export ----------
module.exports = function (ui) {
  const fig = getSidebarFig(ui);
  return Skeletons.Box.Y({
    className: cls(fig, "main"),
    kids: [createNav(ui), createFooter(ui, Visitor.firstname())],
  });
};
