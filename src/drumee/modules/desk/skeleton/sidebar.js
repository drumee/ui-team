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
        sys_pn:"workspace-main"
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
            service: "toggle-settings",
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
                  Skeletons.Note({
                    className: cls(fig, "footer-username"),
                    content: username,
                    active: 0,
                    sys_pn: "sidebar-username",
                    partHandler: ui,
                  }),
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

// ---------- Logo Row (logo + mobile close button) ----------
// Used at the top of both createNav and createActionsNav so the close
// button sits consistently on the right. The close button is rendered
// in both contexts but is hidden via CSS on non-mobile devices.
const createLogoRow = (ui) => {
  const fig = getSidebarFig(ui);

  return Skeletons.Box.X({
    className: `${fig}__logo-row`,
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
      Skeletons.Button.Svg({
        ico: "cross",
        className: `${fig}__logo-close-btn`,
        service: "mobile-close-drawer",
        uiHandler: [ui],
        sys_pn: "mobile-close-btn",
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
      createLogoRow(ui),

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

// ---------- Actions Navigation (mobile only) ----------
// Mirrors createNav's structure (logo + nav-main) so the "actions" mode
// of the mobile drawer looks identical to the "nav" mode — just with
// Add new / Upload / Search / Invite as the rows.
const createActionsNav = (ui) => {
  const fig = getSidebarFig(ui);

  return Skeletons.Box.Y({
    className: `${fig}__nav`,
    kids: [
      createLogoRow(ui),

      Skeletons.Box.Y({
        className: `${fig}__nav-main`,
        kids: [
          createNavItem(ui, "topbar-add", LOCALE.ADD_NEW || "Add new", "new-workspace", "", null, "mobile-add-new"),
          createNavItem(ui, "desktop_upload", LOCALE.UPLOAD, _e.upload, "", null, "mobile-upload"),
          createNavItem(ui, "magnifying-glass", LOCALE.SEARCH || "Search", "search-files", "", null, "mobile-search"),
          createNavItem(ui, "topbar-invite", LOCALE.INVITE || "Invite", "invite-member", "", null, "mobile-invite"),
        ],
      }),
    ],
  });
};

// ---------- Export ----------
module.exports = function (ui) {
  const fig = getSidebarFig(ui);
  const isMobile = Visitor.isMobile();

  if (!isMobile) {
    return Skeletons.Box.Y({
      className: cls(fig, "main"),
      kids: [createNav(ui), createFooter(ui, Visitor.firstname())],
    });
  }

  // Mobile: sidebar becomes a slide-in drawer. data-mode picks between
  // "nav" (default sidebar content) and "actions" (Add new / Upload /
  // Search / Invite rendered as nav-item rows with the same logo
  // header). The footer (Settings / Theme / Sign out / Profile) lives
  // outside both slots so it stays visible in both modes — and so its
  // sys_pn elements (sidebar-avatar, theme-toggle, etc.) stay unique.
  // data-state toggles closed (off-screen) vs open.
  return Skeletons.Box.Y({
    className: cls(fig, "main"),
    sys_pn: "sidebar-main",
    partHandler: ui,
    dataset: {
      mode: "nav",
      state: "closed",
    },
    kids: [
      Skeletons.Box.Y({
        className: cls(fig, "nav-slot"),
        kids: [createNav(ui)],
      }),
      Skeletons.Box.Y({
        className: cls(fig, "actions-slot"),
        kids: [createActionsNav(ui)],
      }),
      createFooter(ui, Visitor.firstname()),
    ],
  });
};
