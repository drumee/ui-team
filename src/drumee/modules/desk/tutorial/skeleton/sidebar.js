/**
 * Tutorial sidebar (visual only; no services).
 * Mirrors the base desk sidebar: logo / nav / workspaces / footer (settings,
 * theme, sign-out, user). Workspaces are static placeholders.
 */

const pfx = (ui) => `${ui.fig.family}__sb`;

// Live plan badge, same derivation as the real sidebar footer
// (desk/skeleton/sidebar.js createFooter).
const planBadge = () =>
  (LOCALE.PLAN_BADGE || "{0} Plan").format(
    require("libs/billing").planLabel(),
  );

const navItem = (ui, ico, label, opts = {}) => {
  const p = pfx(ui);
  return Skeletons.Box.X({
    className: `${p}-item`,
    radio: "tutorial-sidebar-radio",
    kids: [
      Skeletons.Image.Svg({
        ico,
        className: `${p}-item-icon ${opts.color || ""}`,
      }),
      Skeletons.Note({
        className: `${p}-item-text ${opts.color || ""}`,
        content: label,
      }),
    ],
  });
};

const workspaceItem = (ui, name) => {
  const p = pfx(ui);
  return Skeletons.Box.X({
    className: `${p}-workspace-item`,
    kids: [
      Skeletons.Image.Svg({
        ico: "phosphor-folder",
        className: `${p}-workspace-item-icon`,
      }),
      Skeletons.Note({ className: `${p}-workspace-item-name`, content: name }),
    ],
  });
};

const workspaceSection = (ui) => {
  const p = pfx(ui);
  return Skeletons.Box.Y({
    className: `${p}-workspace`,
    kids: [
      Skeletons.Note({
        className: `${p}-workspace-title`,
        content: LOCALE.WORKSPACES,
      }),
      Skeletons.Box.Y({
        className: `${p}-workspace-main`,
        kids: [
          workspaceItem(ui, "Workspace 1"),
          workspaceItem(ui, "Workspace 2"),
          workspaceItem(ui, "Workspace 3"),
        ],
      }),
    ],
  });
};

const getInitials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

const footer = (ui, username) => {
  const p = pfx(ui);
  return Skeletons.Box.Y({
    className: `${p}-footer`,
    kids: [
      navItem(ui, "sidebar_settings", LOCALE.SETTINGS),
      navItem(ui, "sidebar_signout", LOCALE.SIGN_OUT, { color: "red" }),
      Skeletons.Box.Y({
        className: `${p}-footer-user-wrapper`,
        kids: [
          Skeletons.Box.X({
            className: `${p}-footer-user-btn`,
            kids: [
              Skeletons.Box.X({
                className: `${p}-footer-avatar`,
                kids: [
                  Skeletons.Note({
                    className: `${p}-footer-avatar-note`,
                    content: getInitials(username),
                  }),
                ],
              }),
              Skeletons.Box.Y({
                className: `${p}-footer-name-wrapper`,
                kids: [
                  Skeletons.Note({
                    className: `${p}-footer-username`,
                    content: username,
                  }),
                  Skeletons.Note({
                    className: `${p}-footer-user-plan`,
                    // The tour's sidebar mirrors the real sidebar footer
                    // (desk/skeleton/sidebar.js) — read the live entitlement.
                    // Hardcoding PRO_PLAN told every new free user, mid-tour,
                    // that they were on Pro.
                    content: planBadge(),
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
};

const nav = (ui) => {
  const p = pfx(ui);
  return Skeletons.Box.Y({
    className: `${p}-nav`,
    kids: [
      Skeletons.Box.Y({
        className: `${p}-logo`,
        kids: [
          Skeletons.Image.Svg({
            ico: "raw-logo-drumee-full",
            className: `${p}-logo-icon`,
          }),
          Skeletons.Note({
            className: `${p}-header`,
            content: Organization.name() || LOCALE.WORKSPACE_NAME,
          }),
        ],
      }),
      Skeletons.Box.Y({
        className: `${p}-nav-main`,
        kids: [
          navItem(ui, "sidebar_home", LOCALE.HOME),
          navItem(ui, "sidebar_notifications", LOCALE.NOTIFICATIONS),
          navItem(ui, "sidebar_inbox", LOCALE.INBOX),
          navItem(ui, "sidebar_contacts", LOCALE.CONTACTS),
          navItem(ui, "sidebar_trash", LOCALE.TRASH),
          navItem(ui, "sidebar_apps", LOCALE.APPS),
        ],
      }),
      workspaceSection(ui),
    ],
  });
};

module.exports = function (ui) {
  const p = pfx(ui);
  return Skeletons.Box.Y({
    className: `${p}-main`,
    kids: [nav(ui), footer(ui, Visitor.firstname())],
  });
};
