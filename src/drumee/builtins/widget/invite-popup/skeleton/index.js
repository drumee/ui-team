/**
 * Invite popup skeleton — Drumee 2.0, Figma 980:172148 / 785:110823 /
 * 899:78049 (Via email) and 780:188741 / 785:72115 / 785:72862 (Public link).
 * Layout:
 *  - Header: title + close button, then the description
 *  - Org card (name, departments, members) — only inside an organisation
 *  - Tabs: Via email | Public link (switched by CSS on the root's data-tab)
 *  - Via email: "Invite member via email" + chips entry + autocomplete
 *  - "Invite to": All checkbox + department/workspace tree (skeleton/tree)
 *  - Public link: Link Expiration switch + presets, Get link, link row
 *  - Send Invitation button (email tab)
 */
// Same 4-level list every role selector renders (View → Chat → Edit →
// Admin, weakest first, with hover descriptions) — adapted to this
// popup's historical {id, label, bit} shape. Fixes the old hardcoded
// table where "View & Edit" sent the CHAT-level bitmask (0b0000111).
const { roleItems, ROLE_ICONS } = require("builtins/skeleton/toolkit/permission");
// Same area-tinted folder glyph the workspace dropdown rows draw, so the
// picked workspace looks like the row it was picked from.
const folderIcon = require("media/grid/template/folder");

/**
 * The glyph for one picked workspace, or "" when the row has no pick yet.
 *
 * `hub`/`role: "desk"` unconditionally: the tree only ever offers hubs —
 * tree.inviteable drops `personal` via NON_INVITEABLE before anything is
 * listed — so there is no folder case to branch on here.
 *
 * A missing `area` still draws: the template falls back to its own base fill.
 * That is the pre-seeded row's case when a caller supplies a name but no area.
 */
const workspaceGlyph = (ws) =>
  ws && ws.hub_id
    ? folderIcon({
        // `|| ""`, not the bare value: with role "desk" the template skips its
        // own `inner-folder` default and interpolates whatever it was given
        // straight into `class="folder-shape ${area}"` — an undefined here
        // ships a literal `folder-shape undefined` class.
        area: ws.area || "",
        filetype: _a.hub,
        role: "desk",
        widgetId: _.uniqueId("invite-ws-picked-"),
        isAttachment: 1,
      })
    : "";
const ROLES = roleItems.map((r) => ({
  id: r.value,
  label: r.label,
  bit: r.privilege,
  description: r.description,
  // The glyph the permission panel's role pill shows for the same level.
  ico: ROLE_ICONS[r.value],
}));

const DEFAULT_ROLE_IDS = ["edit"];

const computePrivilege = (selectedIds) => {
  const role = ROLES.find((r) => selectedIds.includes(r.id));
  return role?.bit || ROLES.find((r) => r.id === "edit").bit;
};

const summarizeRoles = (selectedIds) => {
  const role = ROLES.find((r) => selectedIds.includes(r.id));
  return role?.label || LOCALE.SELECT_ROLE || "Select role";
};

const { check } = require("./tree");

const header = (ui, pfx) =>
  Skeletons.Box.X({
    className: `${pfx}__header`,
    kids: [
      Skeletons.Note({ className: `${pfx}__title`, content: LOCALE.INVITE_TEAM_TITLE }),
      Skeletons.Button.Svg({
        className: `${pfx}__close`,
        ico: "cross",
        service: "close-invite-popup",
        uiHandler: [ui],
      }),
    ],
  });

// Absent — not empty — outside an organisation (79% of accounts, domain 1).
const orgCard = (ui, pfx) => {
  const o = ui._org;
  if (!o) return null;
  return Skeletons.Box.Y({
    className: `${pfx}__org-card`,
    sys_pn: "org",
    partHandler: ui,
    kids: [
      Skeletons.Note({ className: `${pfx}__org-name`, content: o.name }),
      Skeletons.Box.X({
        className: `${pfx}__org-stats`,
        kids: [
          Skeletons.Note({ className: `${pfx}__pill-num`, content: String(o.department_count || 0) }),
          Skeletons.Note({ className: `${pfx}__org-stat-word`, content: LOCALE.INVITE_DEPARTMENTS }),
          Skeletons.Note({ className: `${pfx}__pill-num`, content: String(o.member_count || 0) }),
          Skeletons.Button.Svg({ ico: "ph-users", className: `${pfx}__pill-ico`, active: 0 }),
        ],
      }),
    ],
  });
};

const TABS = [
  { tab: "email", ico: "ph-envelope-simple", label: () => LOCALE.INVITE_VIA_EMAIL },
  { tab: "link", ico: "apps-globe", label: () => LOCALE.INVITE_PUBLIC_LINK },
];

const tabs = (ui, pfx) =>
  Skeletons.Box.X({
    className: `${pfx}__tabs`,
    sys_pn: "tabs",
    partHandler: ui,
    kids: TABS.map((t) =>
      Skeletons.Box.X({
        className: `${pfx}__tab`,
        service: "switch-tab",
        uiHandler: [ui],
        dataset: { tab: t.tab, state: ui._tab === t.tab ? 1 : 0 },
        kidsOpt: { active: 0 },
        kids: [
          Skeletons.Button.Svg({ ico: t.ico, className: `${pfx}__tab-ico` }),
          Skeletons.Note({ className: `${pfx}__tab-label`, content: t.label() }),
        ],
      }),
    ),
  });

// Parts unchanged from the previous popup (email-row / email-chips /
// email-input / suggestions): the controller's chip and autocomplete logic
// binds to them by sys_pn.
const emailPanel = (ui, pfx) =>
  Skeletons.Box.Y({
    className: `${pfx}__panel-email`,
    kids: [
      Skeletons.Note({ className: `${pfx}__field-label`, content: LOCALE.INVITE_EMAIL_LABEL }),
      // The dropdown floats under the email row instead of sitting in the
      // column, so the dialog does not jump while typing. Anchoring needs a
      // positioned parent, hence this wrapper.
      Skeletons.Box.Y({
        className: `${pfx}__email-field`,
        kids: [
          Skeletons.Box.X({
            className: `${pfx}__email-row`,
            sys_pn: "email-row",
            partHandler: ui,
            kids: [
              Skeletons.Box.X({ className: `${pfx}__chips`, sys_pn: "email-chips", partHandler: ui }),
              Skeletons.Entry({
                className: `${pfx}__email-input`,
                sys_pn: "email-input",
                partHandler: ui,
                uiHandler: [ui],
                placeholder: "name@company.com",
                require: "any",
                mode: "commit",
                service: "submit-email",
                bubble: 0,
              }),
            ],
          }),
          Skeletons.Box.Y({
            className: `${pfx}__suggestions`,
            sys_pn: "suggestions",
            partHandler: ui,
            state: 0,
            active: 0,
          }),
        ],
      }),
      Skeletons.Note({
        className: `${pfx}__field-error`,
        sys_pn: "email-error",
        partHandler: ui,
        dataset: { state: 0 },
        content: "",
      }),
    ],
  });

const inviteTo = (ui, pfx) =>
  Skeletons.Box.Y({
    className: `${pfx}__invite-to`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__invite-to-head`,
        kids: [
          Skeletons.Note({ className: `${pfx}__field-label`, content: LOCALE.INVITE_TO }),
          Skeletons.Box.X({
            className: `${pfx}__all`,
            sys_pn: "all-check",
            partHandler: ui,
            dataset: { state: 0 },
            kids: [
              Skeletons.Note({ className: `${pfx}__all-label`, content: LOCALE.ALL }),
              check(pfx, { state: 0 }, "toggle-all", ui),
            ],
          }),
        ],
      }),
      // Fed by the controller (skeleton/tree.rows) once desk.home answers.
      Skeletons.Box.Y({
        className: `${pfx}__tree`,
        sys_pn: "tree",
        partHandler: ui,
        dataset: { loading: 1 },
      }),
      Skeletons.Note({
        className: `${pfx}__field-error`,
        sys_pn: "workspace-error",
        partHandler: ui,
        dataset: { state: 0 },
        content: "",
      }),
    ],
  });

const PRESETS = [
  { preset: "1h", label: () => LOCALE.INVITE_EXPIRY_1H },
  { preset: "24h", label: () => LOCALE.INVITE_EXPIRY_24H },
  { preset: "7d", label: () => LOCALE.INVITE_EXPIRY_7D },
  { preset: "custom", label: () => LOCALE.CUSTOM, ico: "calendar" },
];

/**
 * The Public link panel's content. Exported so the controller can re-feed
 * the `link-panel` part alone when the switch, a preset or the link changes.
 */
function linkPanelKids(ui, pfx) {
  const l = ui._link;
  const kids = [
    Skeletons.Box.X({
      className: `${pfx}__expiry-head`,
      kids: [
        Skeletons.Note({ className: `${pfx}__field-label`, content: LOCALE.INVITE_LINK_EXPIRATION }),
        Skeletons.Box.X({
          className: `${pfx}__switch`,
          service: "toggle-expiry",
          uiHandler: [ui],
          dataset: { state: l.expiry ? 1 : 0 },
          kids: [Skeletons.Box.X({ className: `${pfx}__switch-knob`, active: 0 })],
        }),
      ],
    }),
  ];
  if (l.expiry) {
    kids.push(
      Skeletons.Box.X({
        className: `${pfx}__expiry-options`,
        kids: PRESETS.map((p) =>
          Skeletons.Box.X({
            className: `${pfx}__expiry-option`,
            service: "pick-expiry",
            uiHandler: [ui],
            dataset: { preset: p.preset, state: l.preset === p.preset ? 1 : 0 },
            kidsOpt: { active: 0 },
            kids: [
              Skeletons.Note({ content: p.label() }),
              p.ico ? Skeletons.Button.Svg({ ico: p.ico, className: `${pfx}__expiry-ico` }) : null,
            ].filter(Boolean),
          }),
        ),
      }),
    );
  }
  kids.push(
    Skeletons.Box.X({
      className: `${pfx}__get-link`,
      service: "get-link",
      uiHandler: [ui],
      kidsOpt: { active: 0 },
      kids: [
        Skeletons.Button.Svg({ ico: "apps-link-simple", className: `${pfx}__get-link-ico` }),
        Skeletons.Note({ content: LOCALE.INVITE_GET_LINK }),
      ],
    }),
  );
  if (l.url) {
    kids.push(
      Skeletons.Box.X({
        className: `${pfx}__link-row`,
        kids: [
          Skeletons.Box.X({
            className: `${pfx}__link-field`,
            service: "copy-link",
            uiHandler: [ui],
            kidsOpt: { active: 0 },
            kids: [
              Skeletons.Button.Svg({ ico: "apps-link-simple", className: `${pfx}__link-ico` }),
              Skeletons.Note({ className: `${pfx}__link-url`, content: l.url }),
              Skeletons.Button.Svg({ ico: "apps-copy", className: `${pfx}__link-copy` }),
            ],
          }),
          Skeletons.Box.X({
            className: `${pfx}__revoke`,
            service: "revoke-link",
            uiHandler: [ui],
            kidsOpt: { active: 0 },
            kids: [
              Skeletons.Button.Svg({ ico: "app-ban", className: `${pfx}__revoke-ico` }),
              Skeletons.Note({ content: LOCALE.INVITE_REVOKE }),
            ],
          }),
        ],
      }),
    );
  }
  return kids;
}

module.exports = function (ui) {
  const pfx = ui.fig.family;
  return Skeletons.Box.Y({
    className: `${pfx}__container`,
    debug: __filename,
    dataset: { tab: ui._tab },
    kids: [
      header(ui, pfx),
      Skeletons.Note({ className: `${pfx}__description`, content: LOCALE.INVITE_TEAM_HINT }),
      orgCard(ui, pfx),
      tabs(ui, pfx),
      emailPanel(ui, pfx),
      inviteTo(ui, pfx),
      Skeletons.Box.Y({
        className: `${pfx}__panel-link`,
        sys_pn: "link-panel",
        partHandler: ui,
        kids: linkPanelKids(ui, pfx),
      }),
      Skeletons.Note({
        className: `${pfx}__send-btn`,
        sys_pn: "send-btn",
        partHandler: ui,
        content: LOCALE.SEND_INVITATION,
        service: "send-invitation",
        uiHandler: [ui],
        state: 0,
      }),
    ].filter(Boolean),
  });
};

module.exports.linkPanelKids = linkPanelKids;
module.exports.workspaceGlyph = workspaceGlyph;
module.exports.ROLES = ROLES;
module.exports.DEFAULT_ROLE_IDS = DEFAULT_ROLE_IDS;
module.exports.computePrivilege = computePrivilege;
module.exports.summarizeRoles = summarizeRoles;
