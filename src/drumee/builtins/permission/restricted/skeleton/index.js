// The area-tinted workspace shape — the single source this app renders a
// workspace icon through (the desk breadcrumb, the switcher rows and the
// create dialog all go via it).
const folderArt = require("media/grid/template/folder");

/**
 * Workspace-members panel body.
 *
 * The Invite and Permissions-Matrix sections are the folder Settings panel's
 * (window/folder/skeleton/settings-action-panel.js
 * __settings-action-invite-section / -members-section) rebuilt under this
 * widget's own prefix, element for element, so the two panels are the same UI
 * and the ported styles map 1:1 — see the skin.
 *
 * The rows are built here from `ui._members` (the panel fetches
 * hub.get_members_by_type itself; see index.js _loadMembers) rather than from a
 * List.Smart of `settings_member` widgets. That widget renders a different row
 * — 40px avatar, name over email, its own role trigger — which no amount of
 * scoped CSS turns into the base's row.
 */
const {
  roleItems: roleOptions,
  roleFromPrivilege,
  roleByValue,
} = require("../../../skeleton/toolkit/permission");
// The folder window's "+ New" menu builder — the role pill's menu is one.
const { dropdownMenuButton } = require("../../../window/skeleton/toolkit");

// One glyph per role, keyed on roleItems' `value`. Chat and Edit are the ones
// the secure-share panels already show for those access levels
// (window/secure-share/skeleton/main.js); View and Admin come from the same
// apps-* set, which is also where the pill's own caret is from.
const ROLE_ICONS = {
  view: "apps-eye",
  chat: "apps-chat",
  edit: "apps-pencil-simple",
  admin: "apps-lock-shield",
};

/**
 * Map a hub.get_members_by_type row to the row shape rendered below.
 *
 * Straight from the base panel's mapFolderMember, including its trim: the
 * stored procedure personalizes the name fields from the caller's contact DB,
 * so an unnamed contact comes back as " " (single space), which plain
 * truthiness would accept and then skip the email fallback.
 */
function mapMember(row) {
  const pick = (...vals) =>
    vals.map((v) => (v == null ? "" : String(v).trim())).find(Boolean) || "—";
  const name = pick(
    row.fullname,
    [row.firstname, row.lastname].filter(Boolean).join(" "),
    row.surname,
    row.email,
  );
  const isSelf = row.id === Visitor.id || row.entity_id === Visitor.id;
  return {
    id: row.entity_id || row.drumate_id || row.id,
    name: isSelf ? `${name} (${LOCALE.YOU || "You"})` : name,
    firstname: (row.firstname || "").trim(),
    lastname: (row.lastname || "").trim(),
    fullname: (row.fullname || "").trim() || name,
    role: roleFromPrivilege(row.privilege),
    // The RAW bitmask, beside the role it resolves to. `role` cannot answer
    // "am I the owner": roleFromPrivilege has four levels and an owner (63)
    // resolves to Admin, exactly as an admin (31) does. viewerCanLeave below
    // needs the owner BIT, which only the mask carries.
    privilege: ~~row.privilege,
    isSelf,
  };
}

/**
 * The role pill: a window-button dropdown — the same `dropdownMenuButton` the
 * folder window's "+ New" menu is built with, so the card and its rows share
 * that menu's look (skin: mixins/drumee window-button-dropdown-menu).
 *
 * Each row carries the target role as dataset, so picking one fires `service`
 * with everything the handler needs; `radio` + `state` keep the held role
 * marked. dropdownMenuButton passes those through to the row untouched.
 */
function roleDropdown(pfx, role, service, extra = {}) {
  const ui = extra.uiHandler;
  const memberId = extra.dataset?.member_id;
  const radioGroup = memberId
    ? `restricted-role-${service}-${memberId}`
    : `restricted-role-${service}`;

  const trigger = Skeletons.Box.X({
    className: `${pfx}__role-select`,
    kids: [
      Skeletons.Note({ className: `${pfx}__role-label`, content: role.label }),
      Skeletons.Button.Svg({
        className: `${pfx}__role-caret`,
        ico: "apps-caret-down",
      }),
    ],
  });

  // `sys_pn` is dropped: dropdownMenuButton defaults it to one shared
  // placeholder, and this panel mounts a menu per member row.
  const { sys_pn, ...menu } = dropdownMenuButton(ui, {
    className: "window-button",
    trigger,
    menuItems: roleOptions.map((opt) => ({
      service,
      ico: ROLE_ICONS[opt.value],
      content: opt.label,
      radio: radioGroup,
      name: opt.label,
      tooltips: opt.description
        ? { content: opt.description, className: "role-option-tooltip" }
        : undefined,
      dataset: {
        ...(memberId ? { member_id: memberId } : {}),
        privilege: opt.privilege,
        role_label: opt.label,
      },
      state: opt.label === role.label ? 1 : 0,
    })),
  });

  return {
    ...menu,
    // The panel's own class beside the shared one — its skin anchors the menu
    // to the pill and styles the selected row off it.
    className: `${menu.className} ${pfx}__role-dropdown`,
    // Kept from the menu this replaces: dropdownMenuButton's `none` would
    // close on any click, where the invite row closes it explicitly.
    persistence: _a.once,
    offsetY: 4,
    // No slide or fade: the menu appears and disappears at once. ui-core's
    // menu tweens with `mget(duration) || Visitor.timeout(duration)` (0.4s by
    // default), so 0 would fall through to Visitor.timeout — which answers a
    // `?timeout=` URL argument when there is one. A 1ms tween is used as-is
    // and still runs the open/close callbacks the menu's state hangs off.
    duration: 0.001,
  };
}

/** The member's real avatar, falling back to initials on the light disc the
 *  skin paints. auto_color off, so the fallback keeps that fixed styling
 *  instead of a per-name generated background. */
function memberAvatar(pfx, member) {
  return Skeletons.UserProfile({
    className: `${pfx}__avatar`,
    auto_color: 0,
    id: member.id,
    firstname: member.firstname,
    lastname: member.lastname,
    fullname: member.fullname,
  });
}

/** True when the signed-in user holds admin in this workspace, read from the
 *  same list the rows render from so the gate and the rows cannot disagree. */
function viewerIsAdmin(list) {
  const self = list.find((m) => m.isSelf);
  if (!self) return false;
  return self.role.label === LOCALE.ROLE_ADMIN;
}

/**
 * May this viewer leave this workspace — i.e. should the red button be drawn?
 *
 * Read off the SAME member list the matrix renders, for the same reason
 * viewerIsAdmin is: one source, so the button and the rows can never disagree
 * about who the viewer is.
 *
 * FAIL CLOSED, and deliberately the opposite of the action rows' fail-open
 * rule. This button costs the viewer every file, folder and conversation in the
 * workspace and only an admin can undo it, so it is drawn only when we
 * positively know two things:
 *
 *   1. the viewer IS a member row here — no self row, no button. That is also
 *      what keeps it off a PERSONAL workspace: `hub_get_members_by_type` exists
 *      only in templates/factory/hub.sql and not in drumate.sql, so a personal
 *      workspace always renders this panel with zero rows. There is nothing to
 *      leave there — it is the user's own home — and desk.leave_hub refuses it
 *      outright (HUB_ID_NOT_ALLOWED when nid == the caller's uid).
 *   2. the viewer is NOT the owner. Nothing server-side stops an owner from
 *      calling desk.leave_hub, which would leave the workspace with no owner at
 *      all; an owner deletes a workspace or hands it over (hub.change_owner),
 *      they do not walk out of it.
 *
 * An ADMIN who is not the owner DOES get the button: they are an invited
 * member like any other, and it is their only exit that does not destroy the
 * workspace for everyone else.
 */
function viewerCanLeave(list) {
  const self = list.find((m) => m.isSelf);
  if (!self) return false;
  return !(self.privilege & _K.permission.owner);
}

function memberRows(list, ui, pfx, isAdmin) {
  if (!list.length) {
    return [
      Skeletons.Note({
        className: `${pfx}__members-empty`,
        content: ui._membersLoaded
          ? LOCALE.NO_FOLDER_MEMBERS || "No member has access yet."
          : LOCALE.LOADING || "Loading…",
      }),
    ];
  }
  return list.map((member, index) => {
    // Self row: read-only label — the server rejects self-mutation anyway.
    // Others, admin viewer: editable role + remove.
    // Others, non-admin viewer: read-only label, no remove.
    const actions =
      member.isSelf || !isAdmin
        ? [
          Skeletons.Note({
            className: `${pfx}__role-label ${pfx}__role-readonly`,
            content: member.role.label,
          }),
        ]
        : [
          roleDropdown(pfx, member.role, "select-member-role", {
            uiHandler: ui,
            dataset: { index, member_id: member.id },
          }),
          Skeletons.Button.Svg({
            className: `${pfx}__member-remove`,
            ico: "trash-action",
            service: "remove-member",
            dataset: { index, member_id: member.id },
            uiHandler: [ui],
          }),
        ];
    return Skeletons.Box.X({
      className: `${pfx}__member-row`,
      dataset: { index, member_id: member.id },
      styleOpt: { zIndex: 1000 - index },
      kids: [
        Skeletons.Box.X({
          className: `${pfx}__member-info`,
          kids: [
            memberAvatar(pfx, member),
            Skeletons.Note({
              className: `${pfx}__member-name`,
              content: member.name,
            }),
          ],
        }),
        Skeletons.Box.X({
          className: `${pfx}__member-actions`,
          kids: actions,
        }),
      ],
    });
  });
}

/**
 * One row per invitation this workspace is waiting on, or that was refused.
 *
 * WHY THE SECTION EXISTS AT ALL. Inviting somebody no longer makes them a
 * member — they have to accept — so between the send and their answer they
 * appear in neither the matrix above nor anywhere else. Without this, an
 * invitation would vanish the moment it was sent and an admin could not tell a
 * sent-and-waiting invitation from one they only think they sent.
 *
 * THE STATUS WORD IS THE POINT. `pending` is a clock and an amber wash;
 * `declined` is a cross and a red one. The server answers with exactly those
 * two (hub_invitations maps token status to them) — an accepted invitation is
 * absent, because that person is a member and belongs in the matrix.
 *
 * 🚨 "Declined", NOT "Rejected". Figma labels the red badge Rejected; Duy asked
 * for Declined, and it is also the word the rest of the flow uses — the email
 * button, the notification row (LOCALE.REFUSE) and the token status all say
 * decline. One word for one act.
 *
 * THE NAME FALLS BACK TO THE ADDRESS, and usually is one: most invitees have
 * no Drumee account, so there is no profile to name them by. `invitee_uid` is
 * null in that case and UserProfile draws its initials-on-colour placeholder
 * from whatever name it is given.
 */
function invitationRows(list, pfx) {
  return list.map((row, index) => {
    const email = String(row.email || "");
    const name = String(row.invitee_fullname || "").trim() || email;
    const inviter = String(row.inviter_fullname || "").trim();
    const when = row.ctime ? Dayjs.unix(Number(row.ctime)).fromNow() : "";
    // "invited 10 minutes ago by Alex".
    //
    // ONE KEY WITH PLACEHOLDERS, not "invited" + when + "by" + inviter glued
    // together: word order is not a constant across the six locale files — zh
    // puts the inviter first — and a sentence assembled from fragments can only
    // ever come out in English order.
    //
    // Dropped entirely when either half is missing, rather than rendered
    // half-built: a row reading "invited by" says less than a row with just a
    // name on it.
    const sub = when && inviter
      ? LOCALE.INVITED_AGO_BY.format(when, inviter)
      : "";
    const declined = row.status === "declined";
    return Skeletons.Box.X({
      className: `${pfx}__invitation-row`,
      dataset: { index, status: row.status || "pending" },
      kids: [
        Skeletons.Box.X({
          className: `${pfx}__invitation-info`,
          kids: [
            Skeletons.UserProfile({
              className: `${pfx}__avatar`,
              auto_color: 0,
              id: row.invitee_uid || "",
              firstname: row.invitee_firstname,
              lastname: row.invitee_lastname,
              fullname: name,
            }),
            Skeletons.Box.Y({
              className: `${pfx}__invitation-text`,
              kids: [
                Skeletons.Note({
                  className: `${pfx}__invitation-name`,
                  content: name,
                }),
                sub
                  ? Skeletons.Note({
                    className: `${pfx}__invitation-sub`,
                    content: sub,
                  })
                  : null,
              ].filter(Boolean),
            }),
          ],
        }),
        Skeletons.Box.X({
          className: `${pfx}__invitation-badge`,
          dataset: { status: declined ? "declined" : "pending" },
          kids: [
            Skeletons.Image.Svg({
              className: `${pfx}__invitation-badge-ico`,
              ico: declined ? "noti-x-circle" : "clock",
            }),
            Skeletons.Note({
              className: `${pfx}__invitation-badge-text`,
              content: declined ? LOCALE.DECLINED : LOCALE.PENDING,
            }),
          ],
        }),
      ],
    });
  });
}

/**
 * Permission management panel skeleton
 * @param {*} ui
 * @returns
 */
module.exports = function (ui) {
  const pfx = ui.fig.family;
  // Default pending-invite role: Edit, as on the base panel.
  const inviteRole = ui._inviteRole || roleByValue("edit");

  // Drop link/anonymous rows before mapping, then reuse the one list for both
  // the admin gate and the rows, so the two cannot diverge (as the base does).
  const members = (ui._members || [])
    .filter((row) => row.entity_id || row.drumate_id || row.id)
    .map(mapMember);
  const isAdmin = viewerIsAdmin(members);
  const canLeave = viewerCanLeave(members);
  // Published back to the widget so _loadInvitations can ask the SAME question
  // this render answered, instead of re-deriving it from a privilege bit.
  //
  // 🚨 Those bits have moved twice (server-essentials 1.3.0 shifted them, 1.3.6
  // put them back), which is why viewerIsAdmin reads the role WORD and not a
  // mask — a second, bit-based copy in index.js would be the one that silently
  // disagrees after a dependency bump. One source, published once per render.
  ui._isAdmin = isAdmin;

  /**
 * Which workspace this panel is about — the area-tinted folder shape and the
 * name, modelled on `.desk-module-topbar__ws-item`, the switcher's row.
 *
 * IT IS THE TITLE, not a chip beside one. The panel used to head itself "Who
 * has access" with the workspace tucked alongside in a bordered tab; the
 * subject now leads on its own and `__subtitle` carries what the panel does.
 * The switcher row is the reference because that is where a user last saw this
 * workspace named, and one workspace should read the same in both places:
 * the same folderArt glyph, the same 22/18 box, the same ellipsising name.
 *
 * The panel said "Who has access" and never said access to WHAT. It is opened
 * from three places that each know the answer already (the rail's Access, the
 * switcher's menu, and the create dialog's follow-up), so the workspace was
 * only ever obvious from whatever was on screen behind it — and on the create
 * path there is nothing behind it yet.
 *
 * READ FROM `media`, FALLING BACK TO THE PANEL'S OWN MODEL. The two feeds
 * differ: window/folder's _internalAccessPanel hands over the window's bound
 * media, which carries filename and area, while media/form wraps the raw
 * create_hub row (a yp.entity row) — that has `area` but no filename, because
 * the proc selects entity columns only. Hence the several names tried below.
 *
 * THREE THINGS ON ONE LINE, in this order: the glyph, the name, then "Who has
 * access". The subject leads and the heading reads as what is being said about
 * it — which is also why the heading is last and not first.
 *
 * THE HEADING IS ALWAYS THERE; the glyph and the name are the optional pair.
 * A name that cannot be resolved drops both of them and the row is the plain
 * heading the panel has always had — never an empty title, and never a tinted
 * folder with no label beside it, which says nothing about WHICH workspace.
 * They are dropped together for that reason: a glyph without its name is not a
 * degraded answer, it is a different and worse one.
 */
function workspaceTab(ui, pfx, cardShown) {
  const media = ui.mget(_a.media);
  const read = (k) => {
    const fromMedia = media && _.isFunction(media.mget) ? media.mget(k) : null;
    return fromMedia || ui.mget(k);
  };
  const filename =
    read(_a.filename) || read("hub_name") || read(_a.name) || "";
  const area = read(_a.area) || _a.private;

  // 🚨 NOT WHEN THE CARD IS SHOWING. The card below names the workspace with
  // the same glyph and the same name, and Figma 85:36439 heads the panel with
  // the title ALONE for that reason — repeating it here says the workspace
  // twice in the first 80px of the panel.
  //
  // Still drawn when there is no card, which is the same condition the card
  // itself drops out on (no resolvable name is impossible — if the name is
  // missing the card is gone AND this list is empty). So the pair is: card
  // present -> plain heading; card absent -> the heading with whatever the
  // header can resolve, exactly as before the card existed.
  const workspace = (!filename || cardShown)
    ? []
    : [
      // Element + content, not Image.Svg + ico: media/grid/template/folder
      // returns an HTML STRING, and passing markup as an icon NAME builds
      // `<use href="#<markup>">` and draws nothing. The switcher row says the
      // same thing about itself (desk/index.js, the ws-item glyph).
      Skeletons.Element({
        active: 0,
        className: `${pfx}__title-icon ${area}`,
        content: folderArt({
          area,
          filetype: _a.hub,
          role: "desk",
          widgetId: _.uniqueId("perm-ws-"),
          isAttachment: 1,
        }),
      }),
      Skeletons.Note({
        active: 0,
        className: `${pfx}__title-name`,
        content: filename,
      }),
    ];

  return Skeletons.Box.X({
    active: 0,
    className: `${pfx}__title`,
    kidsOpt: { active: 0 },
    kids: [
      ...workspace,
      // Its own node, not the title's own text: the title is a flex ROW now, so
      // copy sitting directly on it would be an anonymous flex item that no
      // rule can reach — it could not be kept off the ellipsis the name needs,
      // nor held at its own size beside it.
      Skeletons.Note({
        active: 0,
        className: `${pfx}__title-text`,
        content: LOCALE.WHO_HAS_ACCESS,
      }),
    ],
  });
}

/**
 * The workspace this panel is about, as a card — Figma 85:36439 (#1082:81233).
 *
 * WHAT IT IS FOR. The panel is opened from three places that each already know
 * which workspace is meant, so the subject was only ever obvious from what was
 * on screen behind it — and on the create path there was nothing behind it yet.
 * The header title carried the glyph and the name for that reason; the design
 * promotes them into a bordered card with the two figures that say how big the
 * thing you are granting access TO actually is.
 *
 * THE CARD IS DROPPED ENTIRELY WITHOUT A NAME, exactly as workspaceTab drops
 * its glyph-and-name pair: a bordered box holding a folder shape and two
 * numbers, with no label, names the wrong workspace as easily as the right one.
 *
 * THE FIGURES DEGRADE INDEPENDENTLY. The member count is free — it is the list
 * this panel already rendered. Storage is a second read that may not have
 * landed, or may not be permitted, so its chip is drawn only once there is a
 * number (see _loadSpaceUsage); the card is complete without it rather than
 * showing a placeholder that never fills in.
 */
function workspaceCard(ui, pfx, memberCount) {
  const media = ui.mget(_a.media);
  const read = (k) => {
    const fromMedia = media && _.isFunction(media.mget) ? media.mget(k) : null;
    return fromMedia || ui.mget(k);
  };
  const filename = read(_a.filename) || read("hub_name") || read(_a.name) || "";
  if (!filename) return null;
  const area = read(_a.area) || _a.private;

  // Bytes → "3.5 GB", split so the number and the unit can be coloured
  // separately the way the design does (Primary/40 number, Grey/80 unit).
  // `filesize` is @drumee/ui-essentials' own formatter, already used by the
  // upload progress window — not a second implementation.
  let sizeChip = null;
  const used = Number(ui._spaceUsed);
  if (Number.isFinite(used) && used > 0) {
    const { filesize } = require("@drumee/ui-essentials");
    const text = String(filesize(used) || "").trim();
    // "3.5 GB" → ["3.5", "GB"]. A formatter that ever returns something
    // unsplittable falls back to printing it whole rather than dropping it.
    const at = text.lastIndexOf(" ");
    sizeChip = Skeletons.Box.X({
      active: 0,
      className: `${pfx}__ws-stat`,
      kidsOpt: { active: 0 },
      kids: [
        Skeletons.Note({
          active: 0,
          className: `${pfx}__ws-stat-value`,
          content: at > 0 ? text.slice(0, at) : text,
        }),
        at > 0
          ? Skeletons.Note({
            active: 0,
            className: `${pfx}__ws-stat-unit`,
            content: text.slice(at + 1),
          })
          : null,
      ].filter(Boolean),
    });
  }

  return Skeletons.Box.X({
    active: 0,
    className: `${pfx}__ws-card`,
    kidsOpt: { active: 0 },
    kids: [
      // Element + content, not Image.Svg + ico — folderArt returns an HTML
      // STRING, and handing markup to `ico` builds `<use href="#<markup>">`
      // and draws nothing. Same note as workspaceTab above.
      Skeletons.Element({
        active: 0,
        className: `${pfx}__ws-card-icon ${area}`,
        content: folderArt({
          area,
          filetype: _a.hub,
          role: "desk",
          widgetId: _.uniqueId("perm-ws-card-"),
          isAttachment: 1,
        }),
      }),
      Skeletons.Box.Y({
        active: 0,
        className: `${pfx}__ws-card-text`,
        kidsOpt: { active: 0 },
        kids: [
          Skeletons.Note({
            active: 0,
            className: `${pfx}__ws-card-name`,
            content: filename,
          }),
          Skeletons.Box.X({
            active: 0,
            className: `${pfx}__ws-card-stats`,
            kidsOpt: { active: 0 },
            kids: [
              sizeChip,
              Skeletons.Box.X({
                active: 0,
                className: `${pfx}__ws-stat`,
                kidsOpt: { active: 0 },
                kids: [
                  Skeletons.Note({
                    active: 0,
                    className: `${pfx}__ws-stat-value`,
                    content: `${memberCount}`,
                  }),
                  // Phosphor "Users", which is the icon the Figma frame uses
                  // (componentId 1:702) and already in the sprite.
                  Skeletons.Image.Svg({
                    className: `${pfx}__ws-stat-ico`,
                    ico: "ph-users",
                  }),
                ],
              }),
            ].filter(Boolean),
          }),
        ],
      }),
    ],
  });
}

// The workspace card, built here so the header below can ask whether it exists
  // before deciding to name the workspace a second time.
  const wsCard = workspaceCard(ui, pfx, members.length);

  const header = Skeletons.Box.X({
    className: `${pfx}__header`,
    kids: [
      Skeletons.Box.Y({
        className: `${pfx}__header-text`,
        kids: [
          // ONE child, and it is the workspace. The row used to hold a chip
          // plus a separate "Who has access" Note; workspaceTab now returns
          // the `__title` itself — the icon and the name when there is one,
          // the old heading as a plain Note when there is not — so there is
          // nothing left here to sit beside it or to filter out.
          //
          // The row stays rather than collapsing into the title, because it is
          // what constrains the width: the close button is the header's other
          // child, and without a bounded row a long workspace name pushes it
          // off the edge instead of ellipsising.
          Skeletons.Box.X({
            className: `${pfx}__title-row`,
            kids: [workspaceTab(ui, pfx, !!wsCard)],
          }),
          // NO SUBTITLE. Figma 85:36439 heads the panel with the title alone.
          // "Manage folder permissions" restated what the heading and the
          // sections below already say, and it is the workspace CARD that now
          // answers the question it was really standing in for — which
          // workspace this is about.
        ],
      }),
      // Drawn in both modes. In the drawer it slides the panel out; in column
      // mode (the rail's Access) it hands the column back to the chat panel
      // and the rail back to Files — index.js `_e.close`.
      Skeletons.Button.Svg({
        ico: "cross",
        className: `${pfx}__close`,
        service: _e.close,
        uiHandler: [ui],
      }),
    ].filter(Boolean),
  });

  // The inline invite message (see index.js _setInviteNotice), or null.
  const notice = ui._inviteNotice || null;

  // Only an admin can invite, matching the base panel — a non-admin viewer
  // gets the matrix alone rather than a form the server would reject.
  const inviteSection = isAdmin
    ? Skeletons.Box.Y({
      className: `${pfx}__invite-section`,
      kids: [
        Skeletons.Note({
          className: `${pfx}__section-title`,
          // Figma 85:36439 heads this "Invite member to workspace" — it says
          // WHERE the invitation leads, which matters more now that accepting
          // one is a decision the recipient makes.
          content: LOCALE.INVITE_MEMBER_TO_WORKSPACE,
        }),
        Skeletons.Box.X({
          className: `${pfx}__invite-input-row`,
          kids: [
            // SEVERAL ADDRESSES, ONE SEND. The committed ones become chips and
            // the field keeps whatever is still being typed — see index.js
            // _installChipInput for how a comma, a paste or Enter turns text
            // into a chip, and Backspace on an empty field takes the last one
            // back.
            //
            // The chips and the field share one bordered box (the skin styles
            // __invite-field, not the Entry) so the row reads as one input
            // that happens to hold several people, which is what Figma draws.
            // The Entry keeps its own class because that is what
            // attachEmailLookup and the chip listeners match on.
            Skeletons.Box.X({
              className: `${pfx}__invite-field`,
              kids: [
                ...(ui._inviteChips || []).map((email, index) =>
                  Skeletons.Box.X({
                    className: `${pfx}__invite-chip`,
                    dataset: { index },
                    kids: [
                      Skeletons.Note({
                        active: 0,
                        className: `${pfx}__invite-chip-text`,
                        content: email,
                      }),
                      Skeletons.Button.Svg({
                        className: `${pfx}__invite-chip-remove`,
                        ico: "cross",
                        service: "remove-invite-chip",
                        dataset: { index },
                        uiHandler: [ui],
                      }),
                    ],
                  }),
                ),
                Skeletons.Entry({
                  className: `${pfx}__invite-entry`,
                  sys_pn: "invite-email",
                  formItem: _a.email,
                  // Only the first address prompts; once there are chips the
                  // placeholder would sit beside them repeating itself.
                  placeholder: (ui._inviteChips || []).length
                    ? ""
                    : LOCALE.INVITE_EMAIL_LABEL,
                  require: _a.email,
                  bubble: 0,
                }),
              ],
            }),
            roleDropdown(pfx, inviteRole, "select-invite-role", {
              uiHandler: ui,
            }),
          ],
        }),
        // Address-book matches for the typed string — fed by
        // attachEmailLookup, hidden by the skin until it has rows.
        Skeletons.Box.Y({
          className: `${pfx}__invite-suggestions`,
          sys_pn: "invite-suggestions",
          partHandler: ui,
          dataset: { state: 0 },
          attrOpt: { "data-state": 0 },
          active: 0,
        }),
        // Inline message under the input — a validation error, or the
        // confirmation that an invitation went out. Hidden by data-state until
        // there is something to say, so it costs no vertical space (and no
        // section gap) while empty; data-tone picks the colour.
        //
        // DRAWN FROM STATE, not left to _setInviteNotice's DOM write alone:
        // a successful invite is followed within a second by the server's
        // hub.member_joined push, which re-feeds this whole skeleton — an
        // imperative-only notice would be erased by its own success.
        Skeletons.Box.Y({
          className: `${pfx}__invite-error`,
          sys_pn: "invite-error",
          dataset: {
            state: notice ? _a.open : _a.closed,
            tone: notice ? notice.tone : "error",
          },
          kids: [
            Skeletons.Note({
              className: `${pfx}__invite-error-message`,
              sys_pn: "invite-error-message",
              content: notice ? notice.text : "",
            }),
          ],
        }),
        Skeletons.Note({
          className: `${pfx}__send-button`,
          sys_pn: "invite-send",
          content: LOCALE.SEND_INVITATION,
          service: "send-invitation",
          uiHandler: [ui],
          // Busy while hub.invite is in flight — see _setInviteSending.
          dataset: ui._inviteSending ? { pending: "1" } : undefined,
        }),
      ],
    })
    : null;

  // ── Pending Invitations ───────────────────────────────────────
  // Between the send and the answer, an invitee is in neither list. This is
  // where they wait, and where a refusal is reported.
  //
  // ADMIN ONLY, and only once the read has ANSWERED. `_invitations` is null
  // until then (index.js), which is what separates "not fetched" from "none":
  // the section is absent in the first case rather than flashing an empty
  // heading under the invite form on every open.
  //
  // Absent when there is nothing waiting, too. A workspace whose members all
  // joined has no pending invitations, and a permanently empty section under
  // the form is furniture — Figma draws it with rows in it.
  const invitations = _.isArray(ui._invitations) ? ui._invitations : null;
  const invitationsSection = isAdmin && invitations && invitations.length
    ? Skeletons.Box.Y({
      className: `${pfx}__invitations-section`,
      kids: [
        Skeletons.Note({
          className: `${pfx}__section-title`,
          content: `${LOCALE.PENDING_INVITATIONS} (${invitations.length})`,
        }),
        Skeletons.Note({
          className: `${pfx}__section-hint`,
          content: LOCALE.PENDING_INVITATIONS_HINT,
        }),
        ...invitationRows(invitations, pfx),
      ],
    })
    : null;

  const membersSection = Skeletons.Box.Y({
    className: `${pfx}__members-section`,
    kids: [
      Skeletons.Note({
        className: `${pfx}__section-title`,
        // "Members (6)" — Figma 85:36439. It was "Permissions Matrix", which
        // named the CONTROL rather than what the list is, and read as jargon
        // beside a section called Pending Invitations. The count matters here
        // for the same reason it does above: the two lists are now the two
        // halves of who is in this workspace, and both say how many.
        content: `${LOCALE.MEMBERS} (${members.length})`,
      }),
      ...memberRows(members, ui, pfx, isAdmin),
    ],
  });

  // ── Leave workspace ───────────────────────────────────────────
  // UNDER the Permissions Matrix, last thing in the panel (Lexis, 2026-09-21).
  //
  // WHY IT IS HERE AT ALL: a member below Edit has no other way out. The
  // workspace tile's kebab and the switcher's ⋯ only render an exit row when
  // the viewer holds the write bit (media/core.js contextmenuItemsForHub /
  // contextmenuItemsForFolder both gate on canOrganize/canRemove), so a View or
  // Chat member could be added to a workspace and never able to leave it. This
  // panel is a door every member can reach.
  //
  // THE WARNING COMES FIRST, then the button: what is lost is the part the
  // viewer has to weigh, and a red button on its own only says "careful". The
  // click still opens a confirm card naming the workspace (index.js
  // _leaveWorkspace) — the button itself never leaves anything.
  const leaveSection = canLeave
    ? Skeletons.Box.Y({
      className: `${pfx}__leave-section`,
      kids: [
        Skeletons.Note({
          className: `${pfx}__leave-warning`,
          content: LOCALE.LEAVE_WORKSPACE_WARNING,
        }),
        Skeletons.Note({
          className: `${pfx}__leave-button`,
          sys_pn: "leave-workspace",
          content: LOCALE.LEAVE_WORKSPACE,
          service: "leave-workspace",
          uiHandler: [ui],
        }),
      ],
    })
    : null;

  // Pinned header + scrolling body, after the base panel's -header / -scroll.
  //
  // ORDER IS FIGMA'S: invite, then what is waiting on an answer, then who is
  // already in. 🔒 leaveSection stays LAST and is not in Figma at all — Duy
  // flagged it explicitly when handing over the design. It is the only exit a
  // View or Chat member has (see its own note above), so "not in the mockup"
  // must not be read as "removed".
  const body = Skeletons.Box.Y({
    className: `${pfx}__body`,
    kids: [
      // Built above the header (see `wsCard`) because the header asks whether
      // it exists before deciding to name the workspace itself.
      wsCard,
      inviteSection,
      invitationsSection,
      membersSection,
      leaveSection,
    ].filter(Boolean),
  });

  return Skeletons.Box.Y({
    className: `${pfx}__main`,
    debug: __filename,
    kids: [header, body],
  });
};
