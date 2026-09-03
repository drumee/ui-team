/**
 * The phone's bottom sheets — the Drumee 2.0 shell's three menus, translated.
 *
 * The desktop shell distributes its chrome across three surfaces (43:23955 /
 * 59:55943): the org-tab dropdown switches workspaces, the topbar utility
 * cluster holds the six global destinations, and the avatar menu holds the
 * account rows. A phone gets the same three, as bottom sheets — the legacy
 * drawer (nav/actions/create modes) is gone, and everything it held maps here:
 *
 *   workspaceSheet   the switcher — WORKSPACES / PERSONAL sections, current
 *                    row ticked, "New workspace" at the foot
 *   gotoSheet        the utility cluster as a 3-wide tile grid
 *   accountSheet     identity + Mute notifications / Settings / Get Help /
 *                    Log out, exactly the desktop avatar menu
 *   newSheet         the create options (createEntries — the same data the
 *                    desktop "+ New" menu renders)
 *
 * EVERY row fires "mobile-sheet-go" carrying its REAL service as `goTarget`:
 * the desk closes the sheet and re-dispatches, so the rows reuse the exact
 * handlers the desktop surfaces already have — nothing here grows a second
 * implementation of switching, navigation or creation.
 */
const { createEntries } = require("./create-items");
const folderArt = require("media/grid/template/folder");
const { muteState, muteService } = require("builtins/panel/activity/mute");

// The area-tinted folder shape. The template returns an HTML STRING, so it is
// Element + content — `ico` names a sprite symbol, and passing markup there
// builds `<use href="#<markup>">` which renders nothing.
const wsIcon = (fig, area, filetype) =>
  Skeletons.Element({
    className: `${fig}__msheet-ws-ico ${area || ""}`,
    content: folderArt({
      area,
      filetype: filetype === _a.folder ? _a.folder : _a.hub,
      role: filetype === _a.folder ? "" : "desk",
      widgetId: _.uniqueId("msheet-ws-"),
      isAttachment: 1,
    }),
  });

/**
 * One sheet row. `go` is the REAL service to re-dispatch after the sheet
 * closes; `extra` carries whatever that handler reads off the cmd (wsHubId,
 * name…). kidsOpt active:0 — ui-core binds a click to every widget that does
 * not opt out and stops propagation before triggerHandlers, so a child would
 * eat the tap.
 */
const row = (fig, ui, { icon, label, go, extra = {}, trailing = null, modifier }) =>
  Skeletons.Box.X({
    className: `${fig}__msheet-row${modifier ? ` ${fig}__msheet-row--${modifier}` : ""}`,
    service: "mobile-sheet-go",
    goTarget: go,
    uiHandler: [ui],
    kidsOpt: { active: 0 },
    ...extra,
    kids: [
      icon,
      Skeletons.Note({ className: `${fig}__msheet-label`, content: label }),
      trailing,
    ].filter(Boolean),
  });

const heading = (fig, label) =>
  Skeletons.Note({ className: `${fig}__msheet-heading`, content: label });

const divider = (fig) => Skeletons.Box.X({ className: `${fig}__msheet-divider` });

// ── the switcher ─────────────────────────────────────────────────────────────
function workspaceSheet(ui, rows, curHubId) {
  const fig = ui.fig.family;
  const wsRow = (r) => {
    const hubId = r.hub_id || r.id;
    return row(fig, ui, {
      icon: wsIcon(fig, r.area, r.filetype),
      label: r.filename || r.name || "",
      go: "switch-workspace",
      extra: { wsHubId: hubId },
      trailing:
        curHubId && curHubId == hubId
          ? Skeletons.Image.Svg({
              ico: "desktop_check",
              className: `${fig}__msheet-check`,
            })
          : null,
    });
  };

  const hubs = rows.filter((r) => r.filetype !== _a.folder);
  const personal = rows.filter((r) => r.filetype === _a.folder);
  const section = (label, list) =>
    list.length ? [heading(fig, label), ...list.map(wsRow)] : [];

  return [
    Skeletons.Note({
      className: `${fig}__msheet-title`,
      content: LOCALE.WORKSPACES,
    }),
    ...section(LOCALE.WORKSPACES, hubs),
    ...section(LOCALE.PERSONAL, personal),
    divider(fig),
    row(fig, ui, {
      icon: Skeletons.Image.Svg({
        ico: "topbar-add",
        className: `${fig}__msheet-ico ${fig}__msheet-ico--accent`,
      }),
      label: LOCALE.NEW_WORKSPACE || LOCALE.WORKSPACE,
      go: "new-workspace",
      modifier: "accent",
    }),
  ];
}

// ── the utility cluster, as tiles ────────────────────────────────────────────
function gotoSheet(ui) {
  const fig = ui.fig.family;
  const tile = ({ ico, label, go, badgePn }) =>
    Skeletons.Box.Y({
      className: `${fig}__msheet-tile`,
      service: "mobile-sheet-go",
      goTarget: go,
      uiHandler: [ui],
      kidsOpt: { active: 0 },
      kids: [
        Skeletons.Image.Svg({ ico, className: `${fig}__msheet-tile-ico` }),
        Skeletons.Note({ className: `${fig}__msheet-tile-label`, content: label }),
        // The unread dot rides the notifications tile only. Its own part name:
        // registerPart is last-one-wins, and both other spellings are taken.
        badgePn
          ? Skeletons.Note({
              className: `${fig}__msheet-tile-dot`,
              sys_pn: badgePn,
              partHandler: ui,
              content: "",
            })
          : null,
      ].filter(Boolean),
    });

  return [
    Skeletons.Note({ className: `${fig}__msheet-title`, content: LOCALE.GENERAL }),
    Skeletons.Box.G({
      className: `${fig}__msheet-grid`,
      kids: [
        tile({ ico: "sidebar_notifications", label: LOCALE.NOTIFICATIONS, go: "toggle-activity", badgePn: "activity-count-sheet" }),
        tile({ ico: "sidebar_calendar", label: LOCALE.CALENDAR, go: "toggle-calendar" }),
        tile({ ico: "sidebar_inbox", label: LOCALE.INBOX, go: "toggle-inbox" }),
        tile({ ico: "sidebar_contacts", label: LOCALE.CONTACTS, go: "toggle-contacts" }),
        tile({ ico: "sidebar_trash", label: LOCALE.TRASH, go: "toggle-trash" }),
        tile({ ico: "sidebar_apps", label: LOCALE.ADMIN_CONSOLE, go: "toggle-apps" }),
      ],
    }),
  ];
}

// ── the account menu ─────────────────────────────────────────────────────────
function accountSheet(ui) {
  const fig = ui.fig.family;
  const firstname = Visitor.firstname ? Visitor.firstname() : "";
  const lastname = Visitor.lastname ? Visitor.lastname() : "";
  const fullname =
    (Visitor.fullname ? Visitor.fullname() : "") ||
    `${firstname} ${lastname}`.trim();
  const muted = !!(muteState() || {}).global;

  const iconOf = (ico) =>
    Skeletons.Image.Svg({ ico, className: `${fig}__msheet-ico` });

  return [
    Skeletons.Box.X({
      className: `${fig}__msheet-identity`,
      kidsOpt: { active: 0 },
      kids: [
        Skeletons.UserProfile({
          className: `${fig}__msheet-avatar`,
          id: Visitor.id,
          firstname,
          lastname,
          fullname,
          auto_color: 1,
          oneLetter: 1,
          online: 1,
          live_status: 1,
          active: 0,
        }),
        Skeletons.Box.Y({
          className: `${fig}__msheet-identity-text`,
          kidsOpt: { active: 0 },
          kids: [
            Skeletons.Note({
              className: `${fig}__msheet-identity-name`,
              content: fullname || firstname,
            }),
            Skeletons.Note({
              className: `${fig}__msheet-identity-org`,
              content: Organization.name() || "",
            }),
          ],
        }),
      ],
    }),
    // Hidden where the endpoint is absent — a control that silently does
    // nothing is worse than one that is not there. State comes from the cache
    // activity/mute.js already keeps, so opening the sheet costs no request.
    muteService("mute_set")
      ? row(fig, ui, {
          icon: iconOf(muted ? "bell-simple" : "bell-simple-slash"),
          label: muted ? LOCALE.UNMUTE : LOCALE.MUTE_NOTIFICATIONS,
          go: "toggle-mute-all",
        })
      : null,
    divider(fig),
    row(fig, ui, { icon: iconOf("sidebar_settings"), label: LOCALE.SETTINGS, go: "toggle-settings" }),
    row(fig, ui, { icon: iconOf("ph-info"), label: LOCALE.GET_HELP, go: "toggle-help" }),
    divider(fig),
    row(fig, ui, { icon: iconOf("sidebar_signout"), label: LOCALE.SIGN_OUT, go: "do-logout" }),
  ].filter(Boolean);
}

// ── the create options ───────────────────────────────────────────────────────
// The desktop "+ New" menu, row for row: From device and the Drive import
// (both land on the upload path, so both need write in the current
// workspace), then the five create entries, then Invite for members who can
// manage. Over-limit keeps nothing actionable — same answer the tablet
// consolidated menu gives — and the "+ New" button is hidden then anyway.
function newSheet(ui, { mayWrite, mayManage, locked } = {}) {
  const fig = ui.fig.family;
  if (locked) return [
    Skeletons.Note({ className: `${fig}__msheet-title`, content: LOCALE.NEW }),
  ];
  const iconOf = (ico) =>
    Skeletons.Image.Svg({ ico, className: `${fig}__msheet-ico` });
  return [
    Skeletons.Note({ className: `${fig}__msheet-title`, content: LOCALE.NEW }),
    !mayWrite
      ? null
      : row(fig, ui, { icon: iconOf("app-upload"), label: LOCALE.FROM_DEVICE, go: _e.upload }),
    !mayWrite
      ? null
      : row(fig, ui, { icon: iconOf("logo-google"), label: LOCALE.MIGRATE_GDRIVE_TITLE, go: "launch-gdrive-migration" }),
    !mayWrite ? null : divider(fig),
    ...createEntries(mayWrite).map((e) =>
      row(fig, ui, {
        icon: Skeletons.Image.Svg({ ico: e.ico, className: `${fig}__msheet-ico` }),
        label: e.label,
        go: e.service,
        // The office create services read the template filename back off the
        // cmd with mget(_a.name) — it has to travel as a model field.
        // undefined, not "": a row with no template must not send a blank one.
        extra: e.name ? { name: e.name } : {},
        modifier: e.highlight ? "accent" : undefined,
      }),
    ),
    !mayManage ? null : divider(fig),
    !mayManage
      ? null
      : row(fig, ui, { icon: iconOf("topbar-invite"), label: LOCALE.INVITE, go: "invite-member" }),
  ].filter(Boolean);
}

module.exports = { workspaceSheet, gotoSheet, accountSheet, newSheet };
