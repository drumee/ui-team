/**
 * Topbar — left to right:
 * breadcrumb | [new | search | invite]
 */

const { createEntries } = require("./create-items");
// The mute cache and endpoint probe both live with the notification panel that
// owns this state; importing them keeps one source of truth for what "muted"
// means rather than a second copy that can disagree.
const { muteState, muteService } = require("builtins/panel/activity/mute");

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
 * "Mute notifications" mutes popup cards for EVERY workspace — an empty
 * hub_id is what activity/mute.js calls the global scope. It suppresses the
 * interrupting card and nothing else: a muted user keeps every row in the
 * Notification Center, keeps the unread badge and keeps the tab counts. Muting
 * is "stop talking to me", not "stop recording".
 *
 * The row reflects state, so it reads Unmute once muted. State comes from the
 * cache activity/mute.js already keeps (loaded at panel boot and refreshed
 * from the return value of every write), so opening this menu costs no
 * request. Before the schema is applied, or against a server with no such
 * endpoint, muteState() reports nothing muted and the row is simply hidden —
 * the same fail-open the popup path takes, because a control that silently
 * does nothing is worse than one that is absent.
 *
 * @param {String} pfx  topbar BEM prefix
 * @param {Object} ui   desk module
 */
function userMenu(pfx, ui) {
  // The viewer's own identity. UserProfile renders an avatar from `id` and
  // falls back to initials from the name fields — given NEITHER it renders an
  // empty circle, which is what the topbar was showing.
  const firstname = Visitor.firstname ? Visitor.firstname() : "";
  const lastname = Visitor.lastname ? Visitor.lastname() : "";
  const fullname =
    (Visitor.fullname ? Visitor.fullname() : "") ||
    `${firstname} ${lastname}`.trim();
  const identity = {
    id: Visitor.id,
    firstname,
    lastname,
    fullname,
    auto_color: 1,
  };

  // Cached, never fetched here: activity/mute.js loads it at panel boot and
  // refreshes it from every write, so rendering this menu costs no round trip.
  const muted = !!(muteState() || {}).global;

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
    // A Box that CARRIES the service, wrapping a NON-active UserProfile.
    //
    // UserProfile cannot be the trigger itself. Its own skeleton feeds an
    // inner Box.Y with `active: ui.mget(active)`, and ui-core binds a click to
    // every widget whose `active` is not 0, whose handler calls
    // e.stopPropagation() BEFORE triggerHandlers. The inner box therefore ate
    // the click and the menu never opened. Setting active:0 on the profile
    // silences the inner box AND the profile's own root, so the service has to
    // live on a wrapper that is still active.
    //
    // The wrapper is also what makes the avatar round and centred: it owns the
    // 30px box, the radius and the ring, so none of that depends on which
    // internal element UserProfile happens to render (picture, initials, or an
    // empty placeholder).
    trigger: Skeletons.Box.X({
      className: `${pfx}__account-avatar`,
      sys_pn: "topbar-avatar",
      partHandler: ui,
      service: "open-account-menu",
      kids: [
        Skeletons.UserProfile({
          ...identity,
          className: `${pfx}__account-avatar-img`,
          active: 0,
          // The frame draws a presence dot on the menu's 40px avatar, not on
          // the 30px trigger — at that size it would sit on the initials.
          live_status: 0,
          oneLetter: 1,
        }),
      ],
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
              ...identity,
              className: `${pfx}__account-menu-avatar`,
              // 40x40 with the 8px online dot, per the frame.
              online: 1,
              live_status: 1,
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
        // Hidden when the endpoint is absent — see the note above.
        muteService("mute_set")
          ? row({
              ico: muted ? "bell-simple" : "bell-simple-slash",
              label: muted ? LOCALE.UNMUTE : LOCALE.MUTE_NOTIFICATIONS,
              service: "toggle-mute-all",
              modifier: muted ? "muted" : null,
            })
          : null,
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
      ].filter(Boolean),
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
    // Clicking a row does NOT close the panel. menu_topic closes on an item
    // click only through _onItemClicked, whose switch falls to
    // `default: this._closeItems()` for every persistence it does not name —
    // `once` among them. `always` is the sole value that returns early, so it
    // is what disables the auto-close. The "+ New" menu above already does
    // this.
    //
    // The two other ways out are untouched, because neither reads persistence:
    // a click outside (_onOutsideClick, bound to RADIO_CLICK in the widget's
    // initialize) and the caret (onUiEvent -> _onTriggerClicked ->
    // _triggerToggle -> _closeItems). So the panel cannot strand open.
    persistence: _a.always,
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
    // Figma 48:36991. Three stacked blocks, 12px apart: the current-workspace
    // header, the scrolling list, and the pinned "New workspaces" button.
    //
    // The button is a SIBLING of the list, not a child of it — the frame lists
    // it outside the 191px overflow-clip box, so it stays put while the list
    // scrolls. That is why __ws-list, not __ws-menu, carries the max-height and
    // the overflow (see the skin): a scroller wrapping both would carry the
    // button off the bottom with the rows.
    items: Skeletons.Box.Y({
      className: `${pfx}__ws-menu`,
      kids: [
        // Current workspace: icon + name + rename, then link / overflow.
        // Fed by desk._renderWorkspaceMenu, which already resolves the open
        // workspace and builds the area-tinted folder glyph for the rows.
        Skeletons.Box.X({
          className: `${pfx}__ws-head`,
          sys_pn: "ws-head",
          partHandler: ui,
        }),
        // Fed by desk._renderWorkspaceMenu once desk.home resolves.
        Skeletons.Box.Y({
          className: `${pfx}__ws-list`,
          sys_pn: "ws-list",
          partHandler: ui,
        }),
        // Its OWN service, not the shared `new-workspace`. Wm picks that one's
        // form from context — with a workspace open it feeds folder_form, a
        // SUBFOLDER form — which is right for the topbar's "+ New" but wrong
        // for a button labelled "New workspaces" in a panel listing workspaces.
        Skeletons.Button.Label({
          ico: "ph-plus",
          className: `${pfx}__ws-new`,
          label: LOCALE.NEW_WORKSPACE,
          service: "new-workspace-form",
          uiHandler: [ui],
        }),
      ],
    }),
  });
}

// The desk's own file-search box used to be built here (`deskSearchBox`) and
// mounted by the workspace toolbar, which made that field the GLOBAL search —
// `desk.search` across every hub, and the list of workspaces for an empty query.
// The workspace toolbar owns a workspace-scoped field now
// (window/skeleton/toolkit workspaceSearchBox), so this builder is gone. The
// desk still owns the MOBILE search card, which is global on purpose and builds
// its own field in skeleton/index.js.

