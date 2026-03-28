/**
 * Sidebar module (refactored)
 */

// ---------- Helpers ----------
const getSidebarFig = (ui) => `${ui.fig.family}-sidebar`;

const cls = (fig, suffix) => `${fig}__${suffix}`;

const createStatus = (fig, suffix = "status") =>
  Skeletons.Box.X({ className: cls(fig, suffix) });

const createText = (fig, suffix, content) =>
  Skeletons.Note({ className: cls(fig, suffix), content });

// ---------- Workspace List ----------
// const createWorkspaceItem = (ui, opt = {}) => {
//   const fig = getSidebarFig(ui);

//   return Skeletons.Box.X({
//     className: cls(fig, "workspace-item"),
//     service: "open-node",
//     on_start: "open-node",
//     uiHandler: [Wm],
//     kids: [
//       createStatus(fig, "workspace-item-status"),
//       createText(fig, "workspace-item-name", opt.filename),
//     ],
//   });
// };

// const createWorkspaceList = (ui) => {
//   const fig = `${ui.fig.family}-sidebar`;
//   const list = Skeletons.List.Smart({
//     className: cls(fig, "workspace-list"),
//     innerClass: `${cls(fig, "workspace-content")}`,
//     sys_pn: _a.list,
//     flow: _a.none,
//     timer: 1000,
//     spinnerWait: 1000,
//     spinner: true,
//     vendorOpt: Preset.List.Orange_e,
//     itemsOpt: createWorkspaceItem,
//     api: {
//       service: SERVICE.desk.home,
//       hub_id: Visitor.id,
//     },
//   });

//   if (Visitor.isMobile()) {
//     list.style = {
//       ...list.style,
//       height: window.innerHeight - 160,
//     };
//   }

//   return list;
// };

// ---------- Nav Item ----------
const createNavItem = (ui, ico, label, service = "") => {
  const fig = `${ui.fig.family}-sidebar`;

  return Skeletons.Box.X({
    className: cls(fig, "item"),
    uiHandler: [ui],
    radio: `nav-${ui._id}`,
    service,
    kids: [
      Skeletons.Button.Svg({
        ico,
        className: cls(fig, "item-icon"),
        uiHandler: ui,
      }),
      createText(fig, "item-text", label),
    ],
  });
};

// ---------- Header ----------
const createHeader = (ui, workspaceName) => {
  const fig = getSidebarFig(ui);

  return Skeletons.Box.Y({
    className: cls(fig, "header"),
    kids: [
      createText(fig, "header-title", LOCALE.CURRENT_WORKSPACE),
      Skeletons.Box.X({
        className: cls(fig, "header-workspace"),
        kids: [
          createStatus(fig, "header-status"),
          createText(fig, "header-name", workspaceName),
        ],
      }),
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
      { kind: 'workspace_list', className: cls(fig, "workspace-main"), uiHandler: [ui] },
      // createWorkspaceList(ui),
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
    className: cls(fig, "topics"),
    kids: [
      createNavItem(ui, "storage", LOCALE.APPS),
      createNavItem(ui, "settings", LOCALE.SETTINGS),

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
  const fig = ui.fig.family;

  return Skeletons.Box.Y({
    className: cls(fig, "topics"),
    kids: [
      createHeader(ui, "Acme Agency"),

      createNavItem(ui, "ab_address", LOCALE.HOME),
      createNavItem(ui, "bell", LOCALE.NOTIFICATIONS),
      createNavItem(ui, "desktop_chat", LOCALE.CHAT),
      createNavItem(ui, "drumee-trash", LOCALE.TRASH),

      createWorkspaceSection(ui),
    ],
  });
};

// ---------- Export ----------
module.exports = function (ui) {
  const fig = getSidebarFig(ui);

  return Skeletons.Box.X({
    kids: [
      Skeletons.Box.Y({
        className: cls(fig, "main"),
        kids: [createNav(ui), createFooter(ui, Visitor.firstname())],
      }),
    ],
  });
};
