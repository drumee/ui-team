const { userMenu } = require("../../../builtins/skeleton/toolkit/user");

/**
 * Sidebar module (refactored)
 */

// ---------- Helpers ----------
const getSidebarFig = (ui) => `${ui.fig.family}-sidebar`;

const cls = (fig, suffix) => `${fig}__${suffix}`;

const createText = (fig, suffix, content) =>
  Skeletons.Note({ className: cls(fig, suffix), content });

// ---------- Nav Item ----------
const createNavItem = (ui, ico, label, service = "") => {
  const fig = `${ui.fig.family}-sidebar`;

  return Skeletons.Box.X({
    className: cls(fig, "item"),
    uiHandler: [ui],
    radio: `sidebar-radio`, /** Shaed with workspace-items */
    service,
    kidsOpt: {
      active: 0
    },
    kids: [
      Skeletons.Button.Svg({
        ico,
        className: cls(fig, "item-icon"),
      }),
      createText(fig, "item-text", label),
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

const createFooter = (ui, username) => {
  const fig = getSidebarFig(ui);

  return Skeletons.Box.Y({
    className: cls(fig, "footer"),
    kids: [
      createNavItem(ui, "storage", LOCALE.APPS),
      createNavItem(ui, "settings", LOCALE.SETTINGS, 'toggle-settings'),
      // userMenu(ui)
      // Skeletons.UserProfile({ auto_color:1, oneLetter:1, className: cls(fig, "footer-user-btn") }),
      Skeletons.Box.X({
        className: cls(fig, "footer-user-btn"),
        kids: [
          Skeletons.Box.X({
            className: cls(fig, "footer-avatar"),
            kids: [
              createText(fig, "footer-avatar-note", getInitials(username)),
            ],
          }),
          createText(fig, "footer-username", username),
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
          createText(fig, "header", "WORKSPACE NAME"),
        ],
      }),

      Skeletons.Box.Y({
        kids: [
          createNavItem(ui, "ab_address", LOCALE.HOME, _e.home),
          createNavItem(ui, "bell", LOCALE.NOTIFICATIONS, 'toggle-activity'),
          createNavItem(ui, "desktop_chat", LOCALE.CHAT, 'toggle-chat'),
          createNavItem(ui, "drumee-trash", LOCALE.TRASH, 'toggle-trash'),
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
  })
};
