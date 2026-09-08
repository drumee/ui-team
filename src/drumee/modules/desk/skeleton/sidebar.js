const { canUpgradePlan, planLabel } = require("libs/billing");

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
    // One shared group, so exactly one row is lit — right for every row that
    // REPLACES what is on screen (Files…Access swap the workspace tab, Plan
    // opens a section screen), wrong for one that opens a popup OVER it.
    // Invite does that, so being in the group made it unlight the tab the user
    // was still looking at, and the rail read as though they had left it. It
    // opts out with `soloState` and desk_module lights it by hand instead
    // (_setInviteRowState), which is what lets Files and Invite be lit at once.
    //
    // Opting out costs nothing else: `service` is dispatched by the uiHandler
    // loop in ui-core's letc.js, not by the radio behavior — `isRadio` only
    // decides whether a re-fire of `also:click` is needed when NO handler ran.
    radio: opts.soloState ? undefined : `sidebar-radio`,
    // Which row is lit before the first click. ui-core's radio behavior reads
    // `initialState` at render (addons/backbone/view/behavior/radio.js
    // onRender) and stamps data-radio, and restores it on a "clear:radio" —
    // so this is the group's resting selection, not a one-shot paint.
    // undefined for every other row, exactly like `name` below.
    initialState: opts.initialState,
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

// ---------- Footer ----------
// Whether the user pinned the rail open — read at build time so the rail
// mounts in the state they left it. (Restored verbatim: the drawer removal
// accidentally swept this out with the footer block beside it.)
const isSidebarPinned = () => {
  try {
    return localStorage.getItem("drumee.sidebar.pinned") === "1";
  } catch {
    return false;
  }
};

const createRailFooter = (ui) => {
  const fig = getSidebarFig(ui);
  return Skeletons.Box.Y({
    className: cls(fig, "footer"),
    kids: [
      createNavItem(
        ui,
        "rail-invite",
        LOCALE.INVITE,
        "invite-member",
        "",
        null,
        "sidebar-invite",
        null,
        // Not a destination — it opens a popup over whatever tab is up, so it
        // must not take the rail's highlight away from that tab. See the
        // `soloState` note in createNavItem.
        { soloState: 1 },
      ),
      // Opens the billing page. `upgrade-plan` is the desk's existing service
      // and already carries the canUpgradePlan() gate, so an account that
      // cannot buy still lands somewhere sensible rather than on a dead row.
      createNavItem(
        ui,
        "rail-plan",
        LOCALE.PLAN,
        "upgrade-plan",
        "",
        null,
        "sidebar-plan",
      ),
    ],
  });
};

// ---------- Logo Row ----------
// The rail's header. Desktop only now — the drawer this used to double for is
// gone (the phone shell lives in skeleton/index.js), and with it this row's
// sub-screen form (back arrow + title) and its mobile close button. The
// desktop markup below is byte-identical to what it always rendered.
const createLogoRow = (ui) => {
  const fig = getSidebarFig(ui);

  return Skeletons.Box.X({
    className: `${fig}__logo-row`,
    kids: [
      Skeletons.Box.Y({
        className: `${fig}__logo`,
        kids: [
          // Full wordmark (shown expanded / on hover) + compact mark
          // (shown in the collapsed mini rail). CSS toggles between them.
          Skeletons.Button.Svg({
            ico: "raw-logo-drumee-full",
            className: `${fig}__logo-icon`,
          }),
          // `rail-logo` is the mark exactly as 43:23955 draws it (32x27,
          // single path, currentColor) so it sits white on the indigo
          // rail. The old raw-logo-drumee-icon carries its own brand
          // colours, which read as a dark blob on that ground.
          Skeletons.Button.Svg({
            ico: "rail-logo",
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
      // states; the rail itself shows whether it's open or mini).
      Skeletons.Button.Svg({
        ico: "square-split-horizontal",
        className: `${fig}__logo-pin-btn`,
        service: "toggle-sidebar-pin",
        uiHandler: [ui],
        sys_pn: "sidebar-pin-btn",
        partHandler: ui,
      }),
    ],
  });
};

// ---------- Navigation ----------
const createRailNav = (ui) => {
  const fig = getSidebarFig(ui);

  return Skeletons.Box.Y({
    className: `${fig}__nav`,

    kids: [
      createLogoRow(ui),

      // Workspace-scoped rail — Figma 43:23955 plus the per-tab frames
      // (52:43332 files, 52:43936 chat, 53:51691 task, 53:52738 meet,
      // 59:54860 access). These are the folder window's OWN tabs promoted to
      // global nav: each drives the ACTIVE workspace window, not the desk, so
      // the handler resolves Wm.getActiveWindow(1) at click time.
      //
      // What used to live here moved out rather than away: notifications,
      // calendar, inbox, contacts, trash and the admin console are now the
      // topbar utility cluster, and Settings / Get help / Sign out are in the
      // topbar avatar menu (59:55943) — both in skeleton/topbar.js. Home is
      // the logo row above.
      Skeletons.Box.Y({
        className: `${fig}__nav-main`,
        kids: [
          // Files is the group's default selection: the desk boots into a
          // workspace on its files tab (_railTab's "no stamp reads as files",
          // and _openDefaultWorkspace opens on the default tab), so an unlit
          // rail was disagreeing with the screen behind it.
          createNavItem(ui, "rail-files", LOCALE.FILES, "rail-files", "", null, "sidebar-files", null, { initialState: 1 }),
          createNavItem(ui, "rail-chat", LOCALE.CHAT, "rail-chat", "", null, "sidebar-chat"),
          createNavItem(ui, "rail-task", LOCALE.TASK, "rail-task", "", null, "sidebar-task"),
          createNavItem(ui, "rail-meet", LOCALE.MEET, "rail-meet", "", null, "sidebar-meet"),
          createNavItem(ui, "rail-access", LOCALE.ACCESS, "rail-access", "", null, "sidebar-access"),
        ],
      }),
    ],
  });
};

// ---------- Export ----------
//
// DESKTOP ONLY. The phone has no drawer any more: the approved mobile shell
// (Option A, design canvas "Drumee 2.0 Mobile Shell") replaces it with the
// bottom rail plus three bottom sheets, all built in skeleton/index.js and
// skeleton/mobile-sheets.js. skeleton/index.js simply does not mount this
// module on mobile.
module.exports = function (ui) {
  const fig = getSidebarFig(ui);

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
        kids: [createRailNav(ui), createRailFooter(ui)],
      }),
    ],
  });
};
