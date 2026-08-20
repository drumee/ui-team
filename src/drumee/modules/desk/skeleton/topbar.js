/**
 * Topbar — left to right:
 * breadcrumb | [new | search | invite]
 */

const { createEntries } = require("./create-items");

const addMenuItem = (pfx, ui, ico, label, service, name, opts = {}) =>
  Skeletons.Button.Label({
    ico,
    label,
    name,
    className: `${pfx}__add-menu-item ${opts.iconClass || ""}`,
    dataset: { highlight: opts.highlight ? 1 : 0 },
    service,
    uiHandler: [ui],
  });

// The tablet "more" menu splices these in. Rows come from ./create-items, the
// one list this menu, the "+ New" dropdown below and the mobile drawer's
// `create` mode all read — see that file for the mayWrite rule.
const addItems = (pfx, ui, mayWrite) =>
  createEntries(mayWrite).map((e) =>
    addMenuItem(pfx, ui, e.ico, e.label, e.service, e.name, {
      highlight: e.highlight,
      iconClass: e.iconClass,
    }),
  );

const newMenuRow = (pfx, ui, {
  ico,
  label,
  service,
  name,
  className = "",
  highlight = 0,
}) => Skeletons.Box.X({
  className: `${pfx}__new-menu-item ${className}`,
  uiHandler: [ui],
  service,
  name,
  dataset: { highlight },
  kidsOpt: { active: 0 },
  kids: [
    Skeletons.Button.Svg({
      ico,
      active: 0,
      className: `${pfx}__new-menu-icon`,
    }),
    Skeletons.Note({
      content: label,
      active: 0,
      className: `${pfx}__new-menu-name`,
    }),
  ],
});

// Everything in this menu EXCEPT "Workspace" writes into the workspace the user
// is currently in, so it follows their privilege there: view and chat members
// cannot upload, import, or create files. Creating a NEW WORKSPACE belongs to
// their own account, not to the workspace they happen to be visiting, so it
// always stays.
//
// `mayWrite` is resolved ONCE per render by the caller and threaded in, so every
// surface of this topbar necessarily agrees. Desk._updateAddmenu re-feeds the
// topbar when the answer flips, so the menu follows navigation into and out of a
// workspace.
const deskNewMenu = (pfx, ui, mayWrite) => {
  const createItems = createEntries(mayWrite).map((e) =>
    newMenuRow(pfx, ui, {
      ico: e.ico,
      label: e.label,
      service: e.service,
      // undefined, not "": these rows previously passed no `name` at all, and
      // the framework treats an empty string as a set-but-blank attribute.
      name: e.name || undefined,
      className: `${pfx}__add-menu-item ${pfx}__new-menu-submenu-item ${e.iconClass}`,
    }),
  );

  const createGroup = Skeletons.Box.X({
    className: `${pfx}__new-menu-item ${pfx}__new-menu-create-group`,
    sys_pn: "desk-new-create-group",
    partHandler: ui,
    uiHandler: [ui],
    service: "toggle-desk-new-create-menu",
    dataset: { submenu: _a.closed },
    kidsOpt: { active: 0 },
    kids: [
      Skeletons.Note({
        content: "+",
        active: 0,
        className: `${pfx}__new-menu-create-symbol`,
      }),
      Skeletons.Note({
        content: LOCALE.ADD_NEW || "Add new",
        active: 0,
        className: `${pfx}__new-menu-name`,
      }),
      Skeletons.Box.Y({
        active: 0,
        className: `${pfx}__new-menu-create-submenu`,
        kids: createItems,
      }),
    ],
  });

  return Skeletons.Menu({
    className: `${pfx}__add-wrapper`,
    direction: _a.down,
    duration: 0.01,
    opening: _e.click,
    persistence: _a.always,
    sys_pn: "addmenu",
    partHandler: [ui],
    callback: () => {
      const group = ui.getPart && ui.getPart("desk-new-create-group");
      if (group && group.el) group.el.dataset.submenu = _a.closed;
    },
    trigger: Skeletons.Button.Label({
      ico: "topbar-add",
      className: `${pfx}__new-workspace-btn`,
      label: LOCALE.NEW || "New",
    }),
    items: Skeletons.Box.Y({
      className: `${pfx}__new-menu-items`,
      kids: [
        // Both import rows land on the upload path, so they need write in the
        // current workspace. "" is dropped by ui-core's validChild, the same
        // idiom the tab bar uses to blank a tab.
        !mayWrite ? "" : newMenuRow(pfx, ui, {
          ico: "app-upload",
          label: LOCALE.FROM_DEVICE || "From device",
          service: _e.upload,
          className: `${pfx}__new-menu-item--from-device`,
        }),
        !mayWrite ? "" : newMenuRow(pfx, ui, {
          ico: "logo-google",
          label: LOCALE.MIGRATE_GDRIVE_TITLE || "Migrate from Google Drive",
          service: "launch-gdrive-migration",
          className: `${pfx}__new-menu-item--gdrive`,
        }),
        createGroup,
      ],
    }),
  });
};

module.exports = function (ui) {
  const pfx = `${ui.fig.family}-topbar`;
  // Same two questions the "+ New" dropdown asks, resolved once for the whole
  // topbar: may this viewer create things in the workspace they are in, and may
  // they manage its members? Both fail open when there is no workspace context
  // (the user's own desk) or the privilege cannot be read.
  const mayWrite =
    typeof ui._curWorkspaceCanWrite === "function" ? ui._curWorkspaceCanWrite() : true;
  const mayManage =
    typeof ui._curWorkspaceCanManage === "function" ? ui._curWorkspaceCanManage() : true;

  return Skeletons.Box.X({
    debug: __filename,
    className: `${pfx}__main`,
    kids: [
      // Left cluster — home breadcrumb + folder tabs glued together so
      // the topbar's space-between layout doesn't push them apart.
      Skeletons.Box.X({
        className: `${pfx}__left-cluster`,
        kids: [
          {
            kind: "desk_breadcrumb",
            sys_pn: "breadcrumb",
            className: `${pfx}__breadcrumb`,
            uiHandler: [ui],
          },
          Skeletons.Box.X({
            className: `${pfx}__folder-tabs`,
            sys_pn: "folder-tabs",
            partHandler: ui,
          }),
        ],
      }),

      // Actions cluster (right)
      Skeletons.Box.X({
        className: `${pfx}__actions-cluster`,
        sys_pn :"action-cluster",
        kids: [
          // Downgrade over-limit: creating anything is a write — while the
          // workspace is read-only the whole "+ New" menu goes, rather than
          // offering five entries that each end in a server refusal. The
          // desk re-feeds this part on over-limit:changed, so it comes back
          // the moment the org is within limits again.
          ...(require("libs/over-limit").isLocked() ? [] : [deskNewMenu(pfx, ui, mayWrite)]),

          // Search bar + suggestions.
          //
          // Mobile drops the whole cluster: this topbar is display:none at
          // mobile widths (skin/index.scss, __topbar[data-device="mobile"]),
          // and search there lives in the centered card built by
          // skeleton/index.js. That card reuses these EXACT sys_pn names
          // ("search-box", "search-suggestions", "suggestions-list") so the
          // desk's existing wiring drives it unchanged — which only works if
          // exactly one of the two is ever mounted. "" is dropped by ui-core's
          // validChild, the same idiom the New menu rows use above.
          Visitor.isMobile() ? "" : Skeletons.Box.Y({
            className: `${pfx}__search-container`,
            sys_pn: "search-container",
            partHandler: ui,
            kids: [
              Skeletons.Box.X({
                className: `${pfx}__search-bar`,
                kids: [
                  Skeletons.Image.Svg({
                    ico: "magnifying-glass",
                    className: `${pfx}__search-icon`,
                  }),
                  Skeletons.Entry({
                    className: `${pfx}__search-input`,
                    sys_pn: "search-box",
                    uiHandler: [ui],
                    partHandler: ui,
                    placeholder: LOCALE.SEARCH || "Search...",
                    service: "search-files",
                    type: _a.text,
                    autocomplete: _a.off,
                    interactive: 1,
                  }),
                  Skeletons.Note({
                    className: `${pfx}__search-kbd`,
                    content: "⌘K",
                  }),
                ],
              }),

              // Suggestions dropdown — shown on search bar focus
              Skeletons.Box.Y({
                className: `${pfx}__search-suggestions`,
                sys_pn: "search-suggestions",
                partHandler: ui,
                state: 0,
                kids: [
                  Skeletons.List.Smart({
                    className: `${pfx}__suggestions-list`,
                    sys_pn: "suggestions-list",
                    partHandler: ui,
                    flow: _a.none,
                    spinner: true,
                    spinnerWait: 300,
                    vendorOpt: Preset.List.Orange_e,
                    itemsOpt: {
                      kind: "workspace_item",
                      uiHandler: [ui],
                      // Clicking a search hit reveals it in context: files open
                      // their host folder with the file highlighted, folders open
                      // themselves, messages open the hosting chat. Handled by
                      // desk/index.js onUiEvent → "open-search-hit".
                      service: "open-search-hit",
                    },
                  }),
                ],
              }),
            ],
          }),

          // Invite button — gone while the workspace is over its plan
          // limits: invites are paused (the seat guard and the REST clamp
          // both refuse them), and a button that only ever answers with a
          // refusal toast should not be offered. Same re-feed as "+ New".
          // Also gone for a member who cannot manage this workspace's members:
          // hub.invite / set_privilege ask for the ADMIN bit server-side, so
          // view / chat / edit would only ever meet a refusal.
          ...(require("libs/over-limit").isLocked() || !mayManage ? [] : [Skeletons.Button.Label({
            ico: "topbar-invite",
            className: `${pfx}__invite-btn`,
            label: LOCALE.INVITE || "Invite",
            service: "invite-member",
            uiHandler: [ui],
          })]),

          // Tablet-only consolidated menu (768px ≤ width < 1024px).
          // Flattened: nesting Skeletons.Menu inside another Menu's `items`
          // breaks menu_topic's outside-click handling, so the six Add
          // entries are spliced in at the top instead of behind a sub-menu.
          Skeletons.Menu({
            className: `${pfx}__more-wrapper`,
            direction: _a.down,
            opening: _e.click,
            persistence: _a.once,
            sys_pn: "moremenu",
            partHandler: [ui],
            trigger: Skeletons.Button.Label({
              ico: "bars",
              className: `${pfx}__more-btn`,
            }),
            items: require("libs/over-limit").isLocked()
              // Read-only: creating, uploading and inviting are all paused —
              // the consolidated tablet menu keeps nothing actionable.
              ? []
              : [
                ...addItems(pfx, ui, mayWrite),
                !mayWrite ? "" : Skeletons.Button.Label({
                  ico: "app-upload",
                  className: `${pfx}__more-menu-item`,
                  label: LOCALE.UPLOAD,
                  service: _e.upload,
                  uiHandler: [ui],
                }),
                !mayManage ? "" : Skeletons.Button.Label({
                  ico: "topbar-invite",
                  className: `${pfx}__more-menu-item`,
                  label: LOCALE.INVITE || "Invite",
                  service: "invite-member",
                  uiHandler: [ui],
                }),
              ],
          }),
        ],
      }),
    ],
  });
};
