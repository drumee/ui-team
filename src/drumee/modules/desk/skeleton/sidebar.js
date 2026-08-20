const { userMenu } = require("../../../builtins/skeleton/toolkit/user");
const { canUpgradePlan, planLabel } = require("libs/billing");
const { createEntries } = require("./create-items");

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
  opts = {},
) => {
  const fig = `${ui.fig.family}-sidebar`;

  const kids = [
    Skeletons.Button.Svg({
      ico,
      className: cls(fig, `item-icon ${color}`),
    }),
    createText(fig, `item-text ${color}`, label),
  ];

  // A row that leads somewhere rather than doing something (the mobile "Add
  // new" row, which swaps the drawer to its `create` mode) carries a trailing
  // arrow so it reads as navigation. Pushed before the badge so a row could
  // carry both.
  if (opts.affordance) {
    kids.push(
      Skeletons.Button.Svg({
        ico: opts.affordance,
        className: cls(fig, "item-affordance"),
      }),
    );
  }

  if (badgePn) {
    kids.push(
      Skeletons.Note({
        className: cls(fig, "badge"),
        sys_pn: badgePn,
        partHandler: ui,
        content: "",
        dataset: { count: 0 },
      }),
    );
  }

  return Skeletons.Box.X({
    // `modifier` is a BEM hook for a row that needs to be reachable on its own
    // — mirroring the topbar's --gdrive. Like that one it carries no style of
    // its own today.
    className: opts.modifier
      ? `${cls(fig, "item")} ${cls(fig, `item--${opts.modifier}`)}`
      : cls(fig, "item"),
    uiHandler: [ui],
    radio: `sidebar-radio`,
    service,
    // Template filename for the office create services — Wm.newDocument reads
    // it back with cmd.mget(_a.name), so it has to be a model field on the row
    // itself. undefined for every row that has no use for it.
    name: opts.name,
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
        sys_pn: "workspace-main",
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

// Has the user pinned the desktop sidebar open? Persisted across sessions.
// Default (unset) = not pinned = collapsed-to-rail. Display mode used to
// live in the footer here; it has moved to Settings → Appearance.
const isSidebarPinned = () => {
  try {
    return localStorage.getItem("drumee.sidebar.pinned") === "1";
  } catch {
    return false;
  }
};

const createFooter = (ui, username) => {
  const fig = getSidebarFig(ui);
  // Real plan badge under the username. planLabel (libs/billing) resolves it
  // rather than capitalising quota.plan: that field still carries retired and
  // hand-granted names ('pro', 'Drumee Plus'), which would print a plan that
  // no longer exists.
  const planBadge = (LOCALE.PLAN_BADGE || "{0} Plan").format(planLabel());
  // Environment (does this install sell plans at all?) + ownership rule —
  // see libs/billing. Shared with the upgrade-plan service handler so the
  // entry and its action can never disagree.
  const canUpgrade = canUpgradePlan();

  return Skeletons.Box.Y({
    className: cls(fig, "footer"),
    kids: [
      // Design: a dedicated "Upgrade plan" entry above Settings (org owners
      // and personal accounts only — see canUpgrade above).
      canUpgrade
        ? createNavItem(
            ui,
            "billing",
            LOCALE.UPGRADE_PLAN_MENU || "Upgrade plan",
            "upgrade-plan",
            "",
            null,
            "sidebar-upgrade",
          )
        : null,
      // "Get help" sits above Settings (Figma 58004-54589). Opens the help
      // screen in the same full-page slot as Settings / Billing.
      createNavItem(
        ui,
        "ph-info",
        LOCALE.GET_HELP,
        "toggle-help",
        "",
        null,
        "sidebar-help",
      ),
      createNavItem(
        ui,
        "sidebar_settings",
        LOCALE.SETTINGS,
        "toggle-settings",
        "",
        null,
        "sidebar-settings",
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
                  createText(fig, "footer-user-plan", planBadge),
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
// Used at the top of createNav, createActionsNav and createCreateNav so the
// close button sits consistently on the right. The close button is rendered
// in every context but is hidden via CSS on non-mobile devices.
//
// `opts` turns the row into a SUB-SCREEN header instead: `back` is the service
// a leading arrow fires (the drawer mode to return to) and `title` replaces the
// wordmark. Called with no opts it emits exactly the markup it always has, so
// createNav and createActionsNav are unaffected. The sub-screen form drops the
// pin toggle — it is desktop-only, and this header only ever renders inside the
// mobile drawer — which also keeps its `sidebar-pin-btn` part from gaining a
// third registration.
const createLogoRow = (ui, opts = {}) => {
  const fig = getSidebarFig(ui);
  const isSub = !!opts.back;

  const lead = isSub
    ? Skeletons.Button.Svg({
        ico: "arrow-left",
        className: `${fig}__logo-back-btn`,
        service: opts.back,
        uiHandler: [ui],
        sys_pn: "mobile-back-btn",
      })
    : Skeletons.Button.Svg({
        ico: "square-split-horizontal",
        className: `${fig}__logo-pin-btn`,
        service: "toggle-sidebar-pin",
        uiHandler: [ui],
        sys_pn: "sidebar-pin-btn",
        partHandler: ui,
      });

  return Skeletons.Box.X({
    className: `${fig}__logo-row`,
    kids: [
      // Sub-screen: the back arrow leads, so it comes first and the title takes
      // the wordmark's place. Default: logo block first, pin toggle after it.
      ...(isSub ? [lead] : []),
      Skeletons.Box.Y({
        className: `${fig}__logo`,
        kids: isSub
          ? [createText(fig, "logo-title", opts.title || "")]
          : [
              // Full wordmark (shown expanded / on hover) + compact mark
              // (shown in the collapsed mini rail). CSS toggles between them.
              Skeletons.Button.Svg({
                ico: "raw-logo-drumee-full",
                className: `${fig}__logo-icon`,
              }),
              Skeletons.Button.Svg({
                ico: "raw-logo-drumee-icon",
                className: `${fig}__logo-mark`,
              }),
              createText(
                fig,
                "header",
                Organization.name() || LOCALE.WORKSPACE_NAME,
              ),
            ],
      }),
      // Desktop collapse/pin toggle — a panel/sidebar glyph (same in both
      // states; the rail itself shows whether it's open or mini). Hidden on
      // mobile via CSS (the drawer uses the close button on the right).
      ...(isSub ? [] : [lead]),
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
          createNavItem(
            ui,
            "sidebar_home",
            LOCALE.HOME,
            _e.home,
            "",
            null,
            "sidebar-home",
          ),
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
          createNavItem(
            ui,
            "sidebar_inbox",
            LOCALE.INBOX,
            "toggle-inbox",
            "",
            null,
            "sidebar-inbox",
          ),
          createNavItem(
            ui,
            "sidebar_contacts",
            LOCALE.CONTACTS,
            "toggle-contacts",
            "",
            null,
            "sidebar-contacts",
          ),
          createNavItem(
            ui,
            "sidebar_trash",
            LOCALE.TRASH,
            "toggle-trash",
            "",
            null,
            "sidebar-trash",
          ),
          // Admin Console — the full in-desk console (apps_main), loaded from the
          // @drumee/admin-console plugin on click (see desk onUiEvent "toggle-apps").
          createNavItem(
            ui,
            "sidebar_apps",
            LOCALE.ADMIN_CONSOLE,
            "toggle-apps",
            "",
            null,
            "sidebar-apps",
          ),
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
  // While over-limit the create/upload/invite rows are omitted — same
  // rule as the topbar. Search stays (read).
  const locked = require("libs/over-limit").isLocked();
  // Asked the way the topbar asks it. Distinct from `locked`: the org can be
  // within its limits while THIS viewer still lacks write in the workspace they
  // are standing in.
  const mayWrite =
    typeof ui._curWorkspaceCanWrite === "function"
      ? ui._curWorkspaceCanWrite()
      : true;
  const actionKids = [
    ...(locked
      ? []
      : [
          // Leads to the drawer's `create` mode rather than creating anything
          // itself. It used to fire "new-workspace" straight off, which offered
          // one of the five things the desktop "+ New" group offers; the
          // sub-screen carries the whole list from ./create-items.
          createNavItem(
            ui,
            "app-add",
            LOCALE.ADD_NEW || "Add new",
            "mobile-show-create",
            "",
            null,
            "mobile-add-new",
            null,
            { affordance: "arrow-right" },
          ),
          // A Drive import lands on the same upload path as "From device", so
          // it needs write in the CURRENT workspace — the topbar drops its own
          // copy of this row on the same question, and the handler runs
          // _guardWorkspaceWrite either way. `locked` above cannot stand in for
          // it: an org within its limits still has view and chat members.
          //
          // No new service and no new drawer mode: launch-gdrive-migration
          // already calls closeDeskNewMenu first, which dismisses the drawer on
          // mobile.
          ...(!mayWrite
            ? []
            : [
                createNavItem(
                  ui,
                  "logo-google",
                  LOCALE.MIGRATE_GDRIVE_TITLE || "Migrate from Google Drive",
                  "launch-gdrive-migration",
                  "",
                  null,
                  "mobile-gdrive",
                  null,
                  { modifier: "gdrive" },
                ),
              ]),
          createNavItem(
            ui,
            "app-upload",
            LOCALE.UPLOAD,
            _e.upload,
            "",
            null,
            "mobile-upload",
          ),
        ]),
    // "open-mobile-search", not "search-files": the latter is the search
    // INPUT's per-keystroke service, so a row sharing it landed in the
    // debounce branch and did nothing. This row opens the card; the input
    // inside the card keeps "search-files".
    createNavItem(
      ui,
      "app-search",
      LOCALE.SEARCH || "Search",
      "open-mobile-search",
      "",
      null,
      "mobile-search",
    ),
    ...(locked
      ? []
      : [
          createNavItem(
            ui,
            "topbar-invite",
            LOCALE.INVITE || "Invite",
            "invite-member",
            "",
            null,
            "mobile-invite",
          ),
        ]),
  ];

  return Skeletons.Box.Y({
    className: `${fig}__nav`,
    kids: [
      createLogoRow(ui),

      Skeletons.Box.Y({
        className: `${fig}__nav-main`,
        kids: actionKids,
      }),
    ],
  });
};

// ---------- Create Navigation (mobile only) ----------
// The drawer's `create` sub-screen, reached from the "Add new" row above. Same
// shape as createActionsNav — a header plus nav-main rows — but its header is
// the sub-screen form: a back arrow to `actions` and "Add new" as the title.
//
// The rows are the desktop "+ New" group's own list (./create-items), rendered
// as ordinary sidebar items and carrying the SAME services, so Desk.onUiEvent
// handles a tap here exactly as it handles one in the topbar dropdown — with
// the over-limit and workspace-privilege guards each of those cases already
// runs.
//
// `mayWrite` is asked the same way the topbar asks it, so a view/chat member is
// offered Workspace alone on mobile just as on desktop, rather than four rows
// that can only end in a refusal. Over-limit needs no check here: the "Add new"
// row is absent while locked, so this screen is unreachable.
const createCreateNav = (ui) => {
  const fig = getSidebarFig(ui);
  const mayWrite =
    typeof ui._curWorkspaceCanWrite === "function"
      ? ui._curWorkspaceCanWrite()
      : true;

  return Skeletons.Box.Y({
    className: `${fig}__nav`,
    kids: [
      createLogoRow(ui, {
        back: "mobile-show-add",
        title: LOCALE.ADD_NEW || "Add new",
      }),

      Skeletons.Box.Y({
        className: `${fig}__nav-main`,
        kids: createEntries(mayWrite).map((e) =>
          createNavItem(
            ui,
            e.ico,
            e.label,
            e.service,
            "",
            null,
            null,
            null,
            // The office services need the template filename the topbar rows
            // pass ("document.docx"); Wm.newDocument reads it off the trigger.
            { name: e.name || undefined },
          ),
        ),
      }),
    ],
  });
};

// ---------- Export ----------
module.exports = function (ui) {
  const fig = getSidebarFig(ui);
  const isMobile = Visitor.isMobile();

  if (!isMobile) {
    // The rail is the in-flow flex column that reserves horizontal space
    // in the desk body. __main is absolutely positioned inside it (see
    // sidebar.scss), so widening on hover OVERLAYS the workspace rather
    // than pushing it — no content reflow. data-collapsed drives the
    // mini (icon-only) vs full width; it starts collapsed unless the user
    // has pinned it open. desk_module flips it on "toggle-sidebar-pin".
    return Skeletons.Box.Y({
      className: cls(fig, "rail"),
      sys_pn: "sidebar-rail",
      partHandler: ui,
      // NOTE: use attrOpt, not `dataset` — the framework only honors a
      // skeleton `dataset` when `attribute`/`attrOpt` is ALSO present
      // (letc.js applies dataset onto the attribute model), and `_a.dataset`
      // is undefined so the secondary path is a no-op. attrOpt sets the
      // attribute directly at render time. desk_module flips it on the pin
      // toggle (data-collapsed: "1" = mini rail, "0" = pinned open).
      attrOpt: { "data-collapsed": isSidebarPinned() ? "0" : "1" },
      kids: [
        Skeletons.Box.Y({
          className: cls(fig, "main"),
          kids: [createNav(ui), createFooter(ui, Visitor.firstname())],
        }),
      ],
    });
  }

  // Mobile: sidebar becomes a slide-in drawer. data-mode picks between
  // "nav" (default sidebar content), "actions" (Add new / Upload /
  // Search / Invite rendered as nav-item rows with the same logo
  // header) and "create" (the sub-screen the "Add new" row leads to,
  // holding the five create options). The footer (Settings / Theme /
  // Sign out / Profile) lives outside all three slots so it stays visible in
  // every mode — and so its sys_pn elements (sidebar-avatar, etc.) stay
  // unique. data-state toggles closed (off-screen) vs open.
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
      Skeletons.Box.Y({
        className: cls(fig, "create-slot"),
        kids: [createCreateNav(ui)],
      }),
      createFooter(ui, Visitor.firstname()),
    ],
  });
};
