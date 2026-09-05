/* ==================================================================== *
 * desk_org_tab skeleton — Figma 104:33055 (org-tab + org-dropdown)
 *
 * The topbar chip is the TRIGGER; the dropdown is the Menu's `items`. Both
 * live here because they are one control: the chip's caret is what says the
 * panel exists, and the panel's header repeats the chip's identity.
 * ==================================================================== */
const { multiOrgOnly } = require("../multi-org");

/**
 * The chip: [initial] Org-name [Plan] v
 *
 * The avatar is the org's INITIAL on a tile, not a picture — ui-core's
 * Organization has no logo to serve one from (letc/organization.js `logo()` is
 * an empty stub), and inventing a placeholder photograph would put a face on an
 * organisation that has not chosen one. Same call the tour's mock chip made,
 * for the same reason.
 *
 * @param {String} pfx BEM root
 */
function chip(pfx) {
  const name = Organization.name() || "";
  return Skeletons.Box.X({
    className: `${pfx}__chip`,
    // The trigger must RAISE an event or the menu's own onUiEvent never runs
    // and the panel cannot open. Carrying a `service` is what makes this Box
    // emit; no uiHandler is needed, because the menu declares itself a ui
    // handler for its descendants (declareHandlers in ui-core widgets/menu).
    // The name is never handled anywhere — it exists solely to make the widget
    // emit. Same recipe as the topbar's account avatar, which learned it.
    service: "open-org-menu",
    kids: [
      // EVERY kid is active:0. ui-core binds a click to any widget whose
      // `active` is not 0, and that handler calls e.stopPropagation() BEFORE
      // triggerHandlers — so a live child eats the click and the menu never
      // opens. The wrapper above stays active and carries the whole chip.
      Skeletons.Box.Y({ active: 0,
        className: `${pfx}__avatar`,
        kidsOpt: { active: 0 },
        kids: [
          Skeletons.Note({ active: 0,
            className: `${pfx}__avatar-text`,
            // May be "" on a deployment that names nothing — an empty tile is
            // the right answer there, not a stray character.
            content: name.charAt(0),
          }),
        ],
      }),
      Skeletons.Note({ active: 0, className: `${pfx}__name`, content: name }),
      // The real billing plan, not a literal: the frame's "Business" is one
      // organisation's tier, and planLabel() is the single place this app
      // resolves it (libs/billing).
      Skeletons.Note({ active: 0,
        className: `${pfx}__plan`,
        content: require("libs/billing").planLabel(),
      }),
      Skeletons.Image.Svg({ active: 0, ico: "ph-caret-down", className: `${pfx}__caret` }),
    ],
  });
}

/**
 * The viewer's standing in this organisation — Owner / Admin / Member.
 *
 * The server decides it (three words over a six-step Remit ladder) so the
 * label and the affordances beside it can never disagree: "admin" starts at
 * exactly the tier that may open the org view.
 *
 * Rendered only when there is a role to show. An organisation whose owner's
 * privilege row has gone leaves members with no role at all, and a blank chip
 * is worse than none.
 *
 * @param {String} pfx
 * @param {String} role 'owner' | 'admin' | 'member'
 */
function roleTag(pfx, role) {
  if (!role) return null;
  const label = {
    owner: LOCALE.ORG_ROLE_OWNER,
    admin: LOCALE.ORG_ROLE_ADMIN,
    member: LOCALE.ORG_ROLE_MEMBER,
  }[role];
  if (!label) return null;
  return Skeletons.Note({
    className: `${pfx}__role ${pfx}__role--${role}`,
    content: label,
  });
}

/**
 * One count in the panel header — "3 [cube]" / "24 [people]".
 *
 * @param {String} pfx
 * @param {Number} value
 * @param {String} ico
 * @param {String} tip
 */
function stat(pfx, value, ico, tip) {
  return Skeletons.Box.X({
    className: `${pfx}__stat`,
    kids: [
      Skeletons.Note({ className: `${pfx}__stat-value`, content: String(~~value) }),
      Skeletons.Image.Svg({
        ico,
        className: `${pfx}__stat-ico`,
        // An OBJECT with a className, never a bare string. ui-core appends the
        // tooltip <div> inside this icon and show()s it on hover; a bare string
        // leaves it with the unstyled default class, so it laid out as a flex
        // child of the 16px box and printed the label beside the glyph instead
        // of floating over it. These two counts are bare numbers with no
        // labels, so unlike the cards they genuinely need the affordance.
        tooltips: { content: tip, className: `${pfx}__tip` },
      }),
    ],
  });
}

/**
 * The dropdown's header block: identity, counts, and the way in.
 *
 * The rename pencil and every other affordance is gated on `can_manage`, which
 * the SERVER computed from the same privilege read that would refuse the write.
 * Deciding it client-side from a plan or a name would show a control that
 * fails on click.
 *
 * @param {String} pfx
 * @param {Object} ui
 * @param {Object} data an orgOverview() result
 */
function header(pfx, ui, data) {
  const org = data.organisation || {};
  const name = org.name || Organization.name() || "";
  return Skeletons.Box.X({
    className: `${pfx}__head`,
    kids: [
      Skeletons.Box.Y({
        className: `${pfx}__head-avatar`,
        kids: [
          Skeletons.Note({ className: `${pfx}__avatar-text`, content: name.charAt(0) }),
        ],
      }),
      Skeletons.Box.Y({
        className: `${pfx}__head-id`,
        kids: [
          Skeletons.Box.X({
            className: `${pfx}__head-name-row`,
            // Named so the rename can swap this row's contents for an entry in
            // place — the frame puts the pencil ON the name, so the edit
            // happens where the name is rather than in a dialog.
            sys_pn: "org-name-row",
            partHandler: ui,
            kids: [
              Skeletons.Note({ className: `${pfx}__head-name`, content: name }),
              // The role is shown to EVERYONE, not only to those without a
              // pencil. An owner asking "what am I here?" deserves the same
              // answer a member gets — and an either/or would have told the 52
              // owners on a live install nothing at all, which is the opposite
              // of what the label is for.
              roleTag(pfx, data.role),
              // The pencil is additional, and only for those who may rename.
              data.can_manage
                ? Skeletons.Button.Svg({
                    ico: "ph-pencil-simple-line",
                    className: `${pfx}__rename`,
                    service: "rename-organization",
                    tooltips: { content: LOCALE.RENAME, className: `${pfx}__tip` },
                    uiHandler: [ui],
                  })
                : null,
            ],
          }),
          Skeletons.Box.X({
            className: `${pfx}__stats`,
            kids: [
              stat(pfx, org.department_count, "ph-cube", LOCALE.DEPARTMENTS),
              stat(pfx, org.member_count, "ph-users", LOCALE.MEMBERS),
            ],
          }),
        ],
      }),
      // "Open" — the org view. A Note rather than a Button.Label because the
      // frame draws a bare pill with no icon, and Button.Label always lays out
      // an icon slot.
      //
      // ABSENT, not disabled, below admin: the server sends a member no
      // departments and no workspaces (they carry the names of workspaces the
      // member cannot open), so the screen behind this would be empty. A
      // greyed pill invites a click that can only disappoint; the role beside
      // the org name is what explains its absence.
      data.can_browse
        ? Skeletons.Note({
            className: `${pfx}__open`,
            content: LOCALE.OPEN,
            service: "open-org-view",
            uiHandler: [ui],
          })
        : null,
    ],
  });
}

/**
 * The panel. Fed rather than built inline so the counts can arrive after the
 * chip has already rendered — the chip reads Organization, which the boot
 * payload supplies, while the counts need a round trip.
 *
 * @param {String} pfx
 * @param {Object} ui
 * @param {Object} data
 */
function panel(pfx, ui, data) {
  return Skeletons.Box.Y({
    className: `${pfx}__panel`,
    kids: [
      header(pfx, ui, data),
      Skeletons.Button.Label({
        ico: "apps-gear",
        className: `${pfx}__manage`,
        label: LOCALE.MANAGE_ORGANIZATION,
        service: "manage-organization",
        uiHandler: [ui],
      }),
      // Deferred — see ../multi-org.js. The divider belongs to the gated block,
      // so with the flag off the panel ends cleanly after "Manage organization"
      // rather than on a rule with nothing under it.
      multiOrgOnly(() =>
        Skeletons.Box.Y({
          className: `${pfx}__switch`,
          kids: [
            Skeletons.Box.X({ className: `${pfx}__divider` }),
            Skeletons.Note({
              className: `${pfx}__switch-label`,
              content: LOCALE.SWITCH_ORGANIZATIONS,
            }),
            Skeletons.Box.Y({
              className: `${pfx}__switch-list`,
              sys_pn: "switch-list",
              partHandler: ui,
            }),
            Skeletons.Button.Label({
              ico: "ph-plus",
              className: `${pfx}__new-org`,
              label: LOCALE.NEW_ORGANIZATION,
              service: "new-organization",
              uiHandler: [ui],
            }),
          ],
        }),
      ),
    ],
  });
}

module.exports = function (ui) {
  const pfx = ui.fig.family;

  return Skeletons.Menu({
    className: `${pfx}__wrapper`,
    direction: _a.down,
    // MUST be set explicitly. Without it the menu widget falls back to
    // Visitor.timeout() -> 2000, which is MILLISECONDS, while gsap reads
    // duration in SECONDS — a 2000-second open animation that leaves the panel
    // frozen at its start offset. 0.01 is what every other menu in the topbar
    // passes.
    duration: 0.01,
    opening: _e.click,
    // Clicking a row must not close the panel from under an inline rename.
    // `always` is the only persistence menu_topic returns early for; every
    // other value falls through to `default: this._closeItems()`. The panel can
    // still be dismissed by a click outside or by the chip itself.
    persistence: _a.always,
    sys_pn: "org-menu",
    partHandler: [ui],
    trigger: chip(pfx),
    items: Skeletons.Box.Y({
      className: `${pfx}__items`,
      sys_pn: "org-panel",
      partHandler: ui,
    }),
  });
};

module.exports.panel = panel;
