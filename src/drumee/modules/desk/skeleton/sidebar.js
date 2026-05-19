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
  badgePn,
) => {
  const fig = `${ui.fig.family}-sidebar`;

  const kids = [
    Skeletons.Button.Svg({
      ico,
      className: cls(fig, `item-icon ${color}`),
    }),
    createText(fig, `item-text ${color}`, label),
  ];

  if (badgePn) {
    kids.push(
      Skeletons.Note({
        className: cls(fig, "badge"),
        sys_pn: badgePn,
        partHandler: ui,
        content: "",
        dataset: { count: 0 },
      })
    );
  }

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
    kids,
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
      // Bottom profile item: shows the user's avatar (UserProfile widget —
      // photo with auto-letter fallback) and opens the Settings layout on
      // click. Refreshed on the "avatar-changed" broadcast by desk_module.
      Skeletons.Box.Y({
        className: cls(fig, "footer-user-wrapper"),
        sys_pn: "user-menu-anchor",
        partHandler: ui,
        kids: [
          Skeletons.Box.X({
            className: cls(fig, "footer-user-btn"),
            sys_pn: "user-menu-trigger",
            partHandler: ui,
            service: "open-account",
            uiHandler: [ui],
            kidsOpt: { active: 0 },
            kids: [
              Skeletons.UserProfile({
                className: cls(fig, "footer-avatar"),
                sys_pn: "sidebar-avatar",
                partHandler: ui,
                auto_color: 0,
                oneLetter: 1,
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
            "",
            null,
            "sidebar-notifications",
            "activity-count",
          ),
          createNavItem(ui, "sidebar_inbox", LOCALE.INBOX, "toggle-inbox"),
          createNavItem(ui, "sidebar_contacts", LOCALE.CONTACTS, "toggle-contacts"),
          createNavItem(ui, "sidebar_trash", LOCALE.TRASH, "toggle-trash"),
          createNavItem(ui, "sidebar_apps", LOCALE.ADMIN_CONSOLE, "toggle-apps"),
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
