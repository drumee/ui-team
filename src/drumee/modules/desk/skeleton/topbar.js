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
  // (utilityCluster is defined below this component — hoisted function.)
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
          workspaceSwitcher(pfx, ui),
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
          // Per 43:23955 the top bar carries only the org tab, the breadcrumb
          // and the utility icons. "+ New" and Search moved to the WORKSPACE
          // toolbar (fileFilterControls, window/skeleton/toolkit) and Invite is
          // a left-rail item, so none of the three is duplicated here.
          //
          // "New workspace" — the one thing the old New menu offered that the
          // workspace toolbar does not — lives in the workspace switcher
          // dropdown instead.

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

      utilityCluster(pfx, ui),
    ],
  });
};

/**
 * Utility icon cluster — the top-right group in Figma 43:23955 / 43:29418 /
 * 43:32209: notifications (with unread dot), calendar, inbox, contacts, trash
 * and the admin console, sitting between the actions cluster and the avatar.
 *
 * These fire the SAME services the left rail fires today (toggle-activity,
 * toggle-calendar, …), so this adds a second trigger site rather than any new
 * behaviour — the panels, their mutual exclusion and their reload-restore are
 * untouched. That is deliberate: the rail can only give these up once the
 * cluster is carrying them.
 *
 * @param {String} pfx  topbar BEM prefix
 * @param {Object} ui   desk module
 */
function utilityCluster(pfx, ui) {
  const item = ({ ico, label, service, badgePn }) =>
    Skeletons.Box.X({
      className: `${pfx}__utility-btn`,
      service,
      uiHandler: [ui],
      // Grouped on one radio so the pressed icon reflects which panel is open,
      // the same way the rail rows already do.
      radio: "topbar-utility-radio",
      // MUST be {content, className}, never a bare string. The framework
      // mounts the tooltip as a real child element; without a class of its own
      // it has no styling and no positioning, so it renders as plain inline
      // text INSIDE the 30x30 button — which both looked like stray oversized
      // text on hover and pushed the icons off the row. The className is what
      // lets __utility-tip below take it out of flow. Same contract
      // chat-item/skeleton/menu.js uses.
      tooltips: { content: label, className: `${pfx}__utility-tip` },
      kidsOpt: { active: 0 },
      kids: [
        Skeletons.Button.Svg({ ico, className: `${pfx}__utility-ico` }),
        badgePn
          ? Skeletons.Note({
              className: `${pfx}__utility-badge`,
              sys_pn: badgePn,
              partHandler: ui,
              content: "",
              // attrOpt, not dataset: a bare `dataset` is dropped at render,
              // so the badge would start life with no data-count for the skin
              // to hide it by.
              attrOpt: { "data-count": 0 },
            })
          : null,
      ].filter(Boolean),
    });

  return Skeletons.Box.X({
    className: `${pfx}__utility-cluster`,
    sys_pn: "utility-cluster",
    kids: [
      item({
        ico: "top-bell",
        label: LOCALE.NOTIFICATIONS,
        service: "toggle-activity",
        badgePn: "activity-count-top",
      }),
      item({
        ico: "top-calendar",
        label: LOCALE.CALENDAR,
        service: "toggle-calendar",
      }),
      item({
        ico: "top-inbox",
        label: LOCALE.INBOX,
        service: "toggle-inbox",
      }),
      item({
        ico: "top-contacts",
        label: LOCALE.CONTACTS,
        service: "toggle-contacts",
      }),
      item({
        ico: "top-trash",
        label: LOCALE.TRASH,
        service: "toggle-trash",
      }),
      item({
        ico: "top-apps",
        label: LOCALE.ADMIN_CONSOLE,
        service: "toggle-apps",
      }),
      userMenu(pfx, ui),
    ],
  });
}

/**
 * Avatar + its dropdown — Figma 59:55943. Sits last in the utility cluster.
 *
 * This is where Settings, Get Help and Log out live in the new shell: the
 * design's left rail has no footer, so the rail can only give those up once
 * this menu carries them. Every row fires a service the desk already handles,
 * so nothing here is new behaviour.
 *
 * "Mute notifications" is in the frame but deliberately NOT built: there is no
 * mute concept anywhere in the app (no service, no setting, no server field),
 * so it would be a control that does nothing. Worth designing properly rather
 * than shipping dead.
 *
 * @param {String} pfx  topbar BEM prefix
 * @param {Object} ui   desk module
 */
function userMenu(pfx, ui) {
  const row = ({ ico, label, service, on_click, modifier }) =>
    Skeletons.Button.Label({
      ico,
      className: `${pfx}__account-menu-item${modifier ? ` ${pfx}__account-menu-item--${modifier}` : ""}`,
      label,
      service,
      on_click,
      uiHandler: [ui],
    });

  return Skeletons.Menu({
    className: `${pfx}__account-wrapper`,
    direction: _a.down,
    // duration MUST be set explicitly. Without it the menu widget falls back to
    // Visitor.timeout() -> 2000, which is MILLISECONDS, while gsap reads
    // duration in SECONDS — a 2000-second open animation. The panel then sits
    // frozen at its start offset, which for direction:down is translated UP by
    // (items_height + trigger_height): the menu appears to drop upwards.
    // 0.01 matches deskNewMenu, the one menu here that already passed it.
    duration: 0.01,
    opening: _e.click,
    persistence: _a.once,
    sys_pn: "account-menu",
    partHandler: [ui],
    // Same requirement as the switcher: the trigger must RAISE an event, or
    // the menu's own onUiEvent never runs. Giving the avatar a `service` is
    // what makes it interactive — no uiHandler is needed, because the menu
    // declares itself a ui handler for its descendants (declareHandlers in
    // widgets/menu). The service name is never handled anywhere; it exists
    // solely to make the widget emit.
    trigger: Skeletons.UserProfile({
      className: `${pfx}__account-avatar`,
      sys_pn: "topbar-avatar",
      partHandler: ui,
      service: "open-account-menu",
      auto_color: 0,
      oneLetter: 1,
    }),
    items: Skeletons.Box.Y({
      className: `${pfx}__account-menu`,
      kids: [
        // Identity header — name over presence, matching the frame.
        Skeletons.Box.X({
          className: `${pfx}__account-menu-head`,
          kidsOpt: { active: 0 },
          kids: [
            Skeletons.UserProfile({
              className: `${pfx}__account-menu-avatar`,
              auto_color: 0,
              oneLetter: 1,
            }),
            Skeletons.Box.Y({
              className: `${pfx}__account-menu-id`,
              kidsOpt: { active: 0 },
              kids: [
                Skeletons.Note({
                  className: `${pfx}__account-menu-name`,
                  content: Visitor.fullname
                    ? Visitor.fullname()
                    : Visitor.firstname() || "",
                }),
                Skeletons.Note({
                  className: `${pfx}__account-menu-status`,
                  content: LOCALE.ACTIVE_NOW || "Online",
                }),
              ],
            }),
          ],
        }),
        row({
          ico: "sidebar_settings",
          label: LOCALE.SETTINGS,
          service: "toggle-settings",
        }),
        row({
          ico: "ph-info",
          label: LOCALE.GET_HELP,
          service: "toggle-help",
        }),
        // Log out is a direct call, not a service — same as the rail's row.
        row({
          ico: "sidebar_signout",
          label: LOCALE.SIGN_OUT,
          on_click: Butler.logout,
          modifier: "signout",
        }),
      ],
    }),
  });
}

/**
 * Workspace switcher — Figma 48:36522.
 *
 * REQUIRED, not decorative: the rail used to carry the workspace list and the
 * new rail (Files/Chat/Task/Meet/Access) has no room for it, so without this
 * there is no way to change workspace at all.
 *
 * Rows are fed by the desk (see _renderWorkspaceMenu) from the SAME
 * `desk.home type=node` payload the sidebar list used, rather than mounting
 * the `workspace_list` widget in here. That widget is a List.Smart with its
 * own fetch and its own radio group; nesting it inside a Menu meant it only
 * mounted when the menu first opened and its rows dispatched to a handler the
 * menu had already torn down. Plain rows fed from the desk have neither
 * problem, and the desk needs that payload anyway to pick the boot workspace.
 *
 * The trigger shows the CURRENT workspace name (the frame's "Workspace-name
 * v"), refreshed on every switch by _setWorkspaceLabel.
 *
 * The frame's "Department-name" group header is omitted — departments are
 * deferred, so grouping by one would render an empty or invented level.
 *
 * @param {String} pfx  topbar BEM prefix
 * @param {Object} ui   desk module
 */
function workspaceSwitcher(pfx, ui) {
  return Skeletons.Menu({
    className: `${pfx}__ws-wrapper`,
    direction: _a.down,
    // duration MUST be set explicitly. Without it the menu widget falls back to
    // Visitor.timeout() -> 2000, which is MILLISECONDS, while gsap reads
    // duration in SECONDS — a 2000-second open animation. The panel then sits
    // frozen at its start offset, which for direction:down is translated UP by
    // (items_height + trigger_height): the menu appears to drop upwards.
    // 0.01 matches deskNewMenu, the one menu here that already passed it.
    duration: 0.01,
    opening: _e.click,
    persistence: _a.once,
    sys_pn: "wsmenu",
    // NO `service` here. The menu opens itself from its own onUiEvent when a
    // widget inside its trigger part raises an event — that is how
    // deskNewMenu works. Putting a service on the menu routes the click to the
    // DESK's onUiEvent instead (the pattern the legacy user menu uses, where
    // the desk toggles it by hand), so the menu never saw its own event. The
    // Button.Label trigger is what makes it interactive.
    partHandler: [ui],
    // Caret ONLY — deliberately no label.
    //
    // desk_breadcrumb already renders the workspace as [folder icon] + name
    // (breadcrumb/item/skeleton builds an area-tinted raw-drumee-folder-*
    // glyph), which IS the chip 43:23955 draws. A trigger that repeated the
    // name printed the workspace twice in the bar. The caret sits immediately
    // after the crumb so the two read as one control — icon, name, caret.
    //
    // Still a Button, not a Box: the menu opens from its own onUiEvent, which
    // only fires when a widget inside the trigger part raises an event, and a
    // Box with inert kids raises nothing.
    trigger: Skeletons.Button.Svg({
      className: `${pfx}__ws-btn`,
      ico: "ph-caret-down",
      tooltips: {
        content: LOCALE.WORKSPACES,
        className: `${pfx}__utility-tip`,
      },
    }),
    items: Skeletons.Box.Y({
      className: `${pfx}__ws-menu`,
      kids: [
        // Fed by desk._renderWorkspaceMenu once desk.home resolves.
        Skeletons.Box.Y({
          className: `${pfx}__ws-list`,
          sys_pn: "ws-list",
          partHandler: ui,
        }),
        Skeletons.Button.Label({
          ico: "addmenu-folder",
          className: `${pfx}__ws-new`,
          label: LOCALE.NEW_WORKSPACE,
          service: "new-workspace",
          uiHandler: [ui],
        }),
      ],
    }),
  });
}

/**
 * Desk file-search box + suggestions dropdown.
 *
 * 43:23955 puts search in the WORKSPACE toolbar (between the file-type filter
 * tabs and "+ New"), not in the top bar — so this is exported and built by
 * `fileFilterControls` (window/skeleton/toolkit) instead of here.
 *
 * The desk stays the handler: the sys_pn names ("search-container",
 * "search-box", "search-suggestions", "suggestions-list") and the
 * search-files / open-search-hit services are unchanged, so desk/index.js
 * drives it exactly as before wherever it is mounted. That only holds while
 * EXACTLY ONE copy exists — the mobile card in skeleton/index.js reuses the
 * same names, and the desk topbar is display:none on mobile, so desktop gets
 * this one and mobile gets the card.
 *
 * @param {Object} ui   desk module (the handler)
 * @param {String} pfx  BEM prefix to build the classes under
 */
function deskSearchBox(ui, pfx) {
  return Skeletons.Box.Y({
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
        ],
      }),
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
              service: "open-search-hit",
            },
          }),
        ],
      }),
    ],
  });
}

module.exports.deskSearchBox = deskSearchBox;
