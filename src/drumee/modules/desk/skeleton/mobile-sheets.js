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
const wsIcon = (fig, area, filetype, extra) =>
  Skeletons.Element({
    // Never interactive, wherever it is drawn. Inside a row the parent's
    // kidsOpt says so too; in the header, which can no longer carry a kidsOpt
    // (it holds a button), this is what says it.
    active: 0,
    className: `${fig}__msheet-ws-ico ${area || ""}${extra ? ` ${extra}` : ""}`,
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

/**
 * One chip of the header's action cluster — the phone's answer to the desktop
 * header's `__ws-head-action` (desk/skin/topbar.scss).
 *
 * A BOX CARRYING THE SERVICE, WITH AN INERT GLYPH INSIDE: the shape every
 * interactive thing in this sheet has (__msheet-row, __msheet-tile). It is NOT
 * `Skeletons.Button.Svg` — ui-core's toolkit/skeleton/button/svg.js and
 * .../image/svg.js are the SAME function (both require builder/button/svg, both
 * render `kind: KIND.image.svg`), so that spelling bought nothing and built a
 * bare image_svg with a service on it.
 *
 * `mode` is written to `data-mode`, NEVER `data-state`: skin/lib/utils.scss and
 * skin/lib/align.scss both carry an unscoped
 * `[data-state="closed"] { visibility: hidden !important; height: 0 !important }`,
 * so `closed` is the house word for "hidden" and any element stamped with it
 * disappears wherever it lives. That is what made this control invisible once.
 */
const headChip = (fig, ui, { modifier, ico, service, extra = {}, mode }) =>
  Skeletons.Box.X({
    className: `${fig}__msheet-ws-head-action ${fig}__msheet-ws-head-action--${modifier}`,
    service,
    uiHandler: [ui],
    // On the chip, not on the cluster: it deactivates this chip's own glyph so
    // the tap resolves to the chip. On the cluster it would deactivate the
    // chips themselves.
    kidsOpt: { active: 0 },
    ...(mode ? { attrOpt: { "data-mode": mode } } : {}),
    ...extra,
    kids: [
      Skeletons.Image.Svg({
        ico,
        className: `${fig}__msheet-ws-head-action-ico`,
      }),
    ],
  });

// ── the switcher ─────────────────────────────────────────────────────────────
/**
 * @param {Object} ui   the desk
 * @param {Array}  rows the workspace payload (_fetchWorkspaces)
 * @param {Object} cur  Wm._curWorkspace — the WHOLE object, not its hub_id.
 *   It used to be passed as `cur && cur.hub_id` and every "is this the open
 *   one?" test here compared ids, which is the collision the desktop switcher
 *   documents at length and resolves with `_workspaceKey`: a PERSONAL
 *   workspace is the user, so its hub_id is Visitor.id and every personal row
 *   carries the same one. The tick therefore lit the whole PERSONAL section at
 *   once whenever a personal workspace was open. The key distinguishes them
 *   (`folder:<nid>` vs `hub:<id>`), and the head below needs it anyway — it
 *   has to find ONE row, and an id match would have handed it the first
 *   personal workspace whichever was really open.
 */
function workspaceSheet(ui, rows, cur, opt = {}) {
  const fig = ui.fig.family;
  const curKey = ui._workspaceKey(cur);
  // The sheet has two bodies and one header. `actions` present means the
  // header's button was pressed: the workspace list gives way to that
  // workspace's own actions, and the button becomes the way back.
  const actions = [].concat(opt.actions || []).filter(Boolean);
  const showActions = !!actions.length;
  // 📖 Switching workspace has a BEHAVIOUR CONTRACT — desk/index.js, the block
  // above _railTab. Rule 2 applies to this sheet the moment these rows work:
  // a switch lands on FILES and the rail is reset to Files, but ONLY on a real
  // change of workspace.
  //
  // Each row carries BOTH ids, and they are not interchangeable.
  //
  // `wsKey` is what actually switches: desk/index.js answers "switch-workspace"
  // with `this._switchWorkspaceAndOffer(cmd.mget("wsKey"))`, and
  // `_switchWorkspace` both bails on a falsy key and matches rows by it.
  // hub_id alone is NOT enough, which is the whole reason the key exists —
  // every PERSONAL workspace carries the user's own hub_id, so id-matching
  // opens the first one whichever row was tapped (the same collision that lit
  // the entire "Personal" section at once).
  //
  // `wsHubId` stays because other per-row consumers read it; it is not what
  // the switch resolves on.
  //
  // This closes the gap this comment used to only describe: the rows
  // re-dispatched "switch-workspace" with wsKey undefined, so
  // `_switchWorkspace` returned on its first line — nothing threw, the sheet
  // just closed and the workspace never changed. Desktop was always fine; its
  // rows already set the key.
  const wsRow = (r) => {
    const hubId = r.hub_id || r.id;
    const wsKey = ui._workspaceKey(r);
    return row(fig, ui, {
      icon: wsIcon(fig, r.area, r.filetype),
      label: r.filename || r.name || "",
      go: "switch-workspace",
      extra: { wsHubId: hubId, wsKey },
      // NO TICK. The open workspace is not in this list any more — the header
      // above it is where it appears — so a "you are here" mark here would have
      // nothing to mark. Every row below is somewhere ELSE to go.
    });
  };

  // THE LIST IS EVERYWHERE ELSE. The open workspace is drawn once, by the
  // header, and taking it out of the rows below is what stops the sheet saying
  // the same thing twice.
  //
  // Filtered by the SAME predicate the header resolves itself with, not a
  // second spelling of "is this the current one?": whatever `curRow` turns out
  // to be is exactly what leaves the list, so the two can never disagree — no
  // workspace can be both named above and repeated below, and none can vanish
  // from the list without appearing in the header.
  //
  // It is identity, so it is `_workspaceKey` again rather than hub_id. Matching
  // on the id here would have removed EVERY personal workspace the moment one
  // of them was open, because they all carry the user's own.
  //
  // When nothing resolves — no workspace open, or one reached by deep link that
  // is not in this payload — `curKey` is null, `keep` is true for every row and
  // the list is whole. That is the right answer for the case where there is no
  // header: nothing is being shown twice, so nothing should be hidden.
  const curRow =
    (curKey && rows.find((r) => ui._workspaceKey(r) === curKey)) || null;
  const keep = (r) => !curRow || ui._workspaceKey(r) !== curKey;

  // EXTERNAL, on the same test the desktop header gates its chain chip with
  // (desk/index.js _feedWorkspaceHead) and the same pair window/hub.js
  // openSettings treats as outward-facing. `dmz` is the share area's variant.
  // Internal (private/restricted) and personal workspaces are reached by being
  // a member or by owning them, so there is no share link for a chip to open.
  const isExternal =
    !!curRow && [_a.share, _a.dmz].includes(curRow.area);

  // GROUPED BY THE DESK'S OWN RULE, not by a second one written here.
  //
  // This used to be two buckets — every hub under one WORKSPACES heading, then
  // PERSONAL — which put an internal workspace and one shared with people
  // outside the organisation under the same word. `_groupWorkspaces`
  // (desk/index.js) is where that question is already answered, and it answers
  // it in the CREATE DIALOG's vocabulary rather than inventing one:
  //
  //   INTERNAL   private, restricted
  //   EXTERNAL   share, dmz          — dmz is the share area's variant
  //   PUBLIC     public
  //   PERSONAL   home-root folders
  //
  // It also keeps a WORKSPACES bucket for anything matching none of those, so a
  // new area cannot make a workspace disappear from this sheet.
  //
  // Calling the desk's method is the point: the phone and the desktop switcher
  // now split the list identically, and a change to the taxonomy reaches both.
  // Sharing the rule is also what keeps the two from disagreeing about which
  // heading a `restricted` or `dmz` workspace belongs under — the sheet's old
  // `filetype !== folder` test had no opinion on either.
  //
  // FILTERED BEFORE GROUPING, so the open workspace is gone before the buckets
  // are counted; _groupWorkspaces already drops empty groups, which is what
  // makes a heading leave with its last row.
  const groups = ui._groupWorkspaces(rows.filter(keep));
  const section = (label, list) =>
    list.length ? [heading(fig, label), ...list.map(wsRow)] : [];

  // ── The open workspace ─────────────────────────────────────────────────────
  // The desktop switcher's `__ws-head` (desk/skin/topbar.scss, Figma 48:37074),
  // as the sheet's first block: the area-tinted glyph and the name, over a rule.
  //
  // IDENTITY ONLY. The desktop header ends in two chips — the external-only
  // share link and the ⋯ — and neither came along. The ⋯ fires
  // "workspace-menu", which in desk/index.js measures
  // `cmd.el.closest(".menu-topic-items")` and floats a panel beside that card;
  // inside a bottom sheet there is no such card, so it would fall back to the
  // button's own rect and hang a desktop flyout off a row near the bottom of
  // the screen. A control that lands in the wrong place is worse than one that
  // is not offered, and the phone reaches the same actions from the workspace
  // itself.
  //
  // `cur` is what Wm tracks and carries neither the name nor the area, so the
  // matching ROW is what this is built from — the row is what knows the area
  // the glyph is tinted by. Same resolution the desktop header does
  // (_feedWorkspaceHead), by key rather than by id.
  //
  // `curRow` is resolved ABOVE, where the list is filtered — one lookup feeds
  // both halves, so the workspace this header names is by construction the one
  // the rows below leave out.
  //
  // Null when nothing matches — on the very first paint, or where the open
  // workspace is not in the payload — and then no header is built at all,
  // rather than one fed empty and hidden by CSS: `Skeletons.Box` is never
  // `:empty` (it carries a widget-blank empty view), so a
  // `:empty { display: none }` rule would draw the rule and the padding over
  // nothing.
  // NO `kidsOpt` ON THE HEADER. It merges into every direct kid, and one of
  // them is now a BUTTON — `active: 0` would make `triggerHandlers` return on
  // its first line and the button would raise nothing at all, silently. The
  // glyph and the name carry `active: 0` individually instead, which is all the
  // kidsOpt was ever doing here.
  const head = curRow
    ? Skeletons.Box.X({
        className: `${fig}__msheet-ws-head`,
        kids: [
          wsIcon(fig, curRow.area, curRow.filetype, `${fig}__msheet-ws-ico--head`),
          Skeletons.Note({
            className: `${fig}__msheet-ws-head-name`,
            content: curRow.filename || curRow.name || "",
            active: 0,
          }),
          // THE DESKTOP HEADER'S ACTION CLUSTER (__ws-head-actions), on a
          // phone: the share chip on an EXTERNAL workspace, then the ⋯. An
          // internal or personal workspace gets the ⋯ alone.
          //
          // A wrapper, like the desktop's, so the two chips sit 4px apart while
          // the header's own 12px gap keeps the name clear of them — and so the
          // NAME is what gives way on a long workspace, never the controls.
          //
          // NO kidsOpt on the wrapper: it merges into every direct kid, and
          // both kids are controls. `active: 0` would make triggerHandlers
          // return on its first line and neither chip would raise anything.
          Skeletons.Box.X({
            className: `${fig}__msheet-ws-head-actions`,
            kids: [
              // EXTERNAL ONLY, on the test the desktop header gates its chain
              // chip with (_feedWorkspaceHead): the icon stands for the share
              // link that lets someone outside reach the workspace, and only an
              // external one has such a link. An internal workspace is reached
              // by being a member, so there is nothing for it to open.
              //
              // Routed through "mobile-ws-action" rather than raising
              // `workspace-access` directly: that service toggles the
              // secure-share view, which would come up UNDERNEATH an open
              // sheet. The shared handler closes the sheet first, and `onDesk`
              // sends it to the desk rather than to the workspace's media item.
              isExternal
                ? headChip(fig, ui, {
                    modifier: "link",
                    ico: "apps-link-simple",
                    service: "mobile-ws-action",
                    extra: { goTarget: "workspace-access", onDesk: 1 },
                  })
                : null,
              // ONE BUTTON WITH TWO FACES, not two buttons swapped: it keeps
              // its place in the row, so the press that opens the actions and
              // the press that closes them are the same target under the thumb.
              headChip(fig, ui, {
                modifier: "more",
                ico: showActions ? "cross" : "app-dots-horizontal",
                service: showActions ? "mobile-ws-actions-close" : "mobile-ws-actions",
                mode: showActions ? "actions" : "list",
              }),
            ].filter(Boolean),
          }),
        ],
      })
    : null;

  // THREE PARTS, and only the middle one moves — the same shape the desktop
  // switcher has (`__ws-menu` / `__ws-head` / `__ws-list` / `__ws-new` in
  // desk/skin/topbar.scss). The title and the create button are chrome; the
  // rows are content. Letting the whole sheet scroll sent the create button off
  // the bottom edge, and it is the only way to make a workspace from here, so
  // it must never need scrolling to reach — the reason the desktop menu gives
  // for putting its overflow on __ws-list rather than on the menu box.
  //
  // The list is its OWN box rather than the sheet's scroller because
  // __msheet-content is shared by all four sheets: the go-to grid, the account
  // rows and the create options still want it scrolling them wholesale. Only
  // this kind splits chrome from content, and the skin scopes that split on the
  // host's `data-kind="workspace"`.
  return [
    Skeletons.Note({
      className: `${fig}__msheet-title`,
      content: LOCALE.WORKSPACES,
    }),
    // Chrome, like the title and the button — it names the workspace the list
    // is being chosen FROM, so it stays put while the rows scroll under it.
    head,
    // NO kidsOpt HERE. This wrapper's direct kids are the workspace ROWS, and
    // ui-core's builder merges a box's kidsOpt into every one of them
    // (toolkit/builder.js, `_.merge(kid, kidsOpt)` — the parent's value wins).
    // With `active: 0` on it, every row's model carried active:0, and
    // `View.prototype.triggerHandlers` returns on its FIRST line for such a
    // widget — so a tap raised no ui event, "mobile-sheet-go" never fired,
    // nothing was re-dispatched and nothing threw. Tapping a workspace simply
    // did nothing.
    //
    // It arrived with the scrolling split (c59b3d2a), copied from the row
    // builder, where the same option is correct and load-bearing: there it
    // deactivates a ROW's icon and label so a child cannot swallow the tap
    // meant for the row. On the list it deactivates the rows themselves.
    //
    // Nothing is needed in its place. The headings are plain Notes with no
    // service and no uiHandler, so triggerHandlers drops them at its
    // `_.isEmpty(handlers)` check without having to be switched off.
    Skeletons.Box.Y({
      className: `${fig}__msheet-list`,
      // THE SAME BOX EITHER WAY. The actions replace what is IN the list, not
      // the list itself: it is the one scrolling region of this sheet (the skin
      // scopes `flex: 1 1 auto; min-height: 0` and the brand scrollbar to it),
      // so rendering the actions anywhere else would put them outside the only
      // box that can scroll and push the create button off the bottom edge.
      //
      // Same flatMap the desktop switcher feeds its __ws-list with
      // (desk/index.js _renderWorkspaceMenu), so the two lists are built from
      // one grouping in one order.
      kids: showActions
        ? actions.map((a) =>
            row(fig, ui, {
              // ITS OWN CLASS, not the sheet's __msheet-ico. These glyphs are
              // the desktop context menu's (`ctxmenu-*`, from the shared icon
              // map), and that menu draws them at 16px inside its slot — the
              // sheet's rule forces every glyph to 22×22, which blew them up
              // and squared off the ones that are not square (`topbar-invite`
              // is 15×11 artwork). The skin mirrors contextmenu-item__icon.
              //
              // `data-ico` carries the SPRITE name so the per-glyph exceptions
              // can be written against it: the exception belongs to the
              // artwork, not to the menu key.
              //
              // No icon rather than a fallback glyph — as the desktop menu
              // does, which renders no icon element when the key has none. The
              // old `|| "ph-dots-three"` stand-in made every unillustrated row
              // look like it opened a menu of its own.
              icon: a.ico
                ? Skeletons.Image.Svg({
                    ico: a.ico,
                    className: `${fig}__msheet-action-ico`,
                    attrOpt: { "data-ico": a.ico },
                  })
                : null,
              label: a.label,
              // The REAL service travels as goTarget, exactly as every other
              // sheet row does. What differs is who answers: `service` in
              // `extra` overrides the builder's "mobile-sheet-go" (it spreads
              // after it), because that one re-dispatches on the DESK and these
              // rows have to land on the workspace's media item.
              go: a.service,
              extra: {
                service: "mobile-ws-action",
                onDesk: a.onDesk ? 1 : 0,
              },
            }),
          )
        : groups.flatMap((g) => section(g.label, g.rows)),
    }),
    // The desktop's __ws-new, as a sheet row: a SOLID primary button, centred,
    // pinned under the list. No divider above it any more — a rule is what
    // separated the old text-link version from the rows, and a filled button
    // already reads as an action ON the list rather than another workspace IN
    // it. Still a __msheet-row, so the "mobile-sheet-go" dispatch, the goTarget
    // and the kidsOpt tap-guard are all unchanged.
    row(fig, ui, {
      icon: Skeletons.Image.Svg({
        ico: "topbar-add",
        className: `${fig}__msheet-ico`,
      }),
      label: LOCALE.NEW_WORKSPACE || LOCALE.WORKSPACE,
      go: "new-workspace",
      modifier: "new",
    }),
    // `head` is null wherever the open workspace cannot be resolved; the other
    // three sheets already end this way for their own conditional rows.
  ].filter(Boolean);
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

  // locale/supported, NOT locale/lang: the latter statically requires every
  // string table, so requiring it here would duplicate all of them into the
  // desk chunk just to read a two-letter code.
  const uiLang = require("locale/supported");
  const currentLanguage = uiLang.current();

  // Same group the desktop account menu carries, so a phone user is not the
  // only one who cannot change language. Labels come from `LOCALE[code]` —
  // the established lookup for language names — so the list reads
  // "English / French" in English and "Anglais / Français" in French.
  const languageRows = uiLang.SUPPORTED.map((code) => {
    const active = code === currentLanguage;
    return row(fig, ui, {
      icon: iconOf("apps-globe"),
      label: LOCALE[code] || code.toUpperCase(),
      // Selecting the language already in use would reload the app for no
      // change; an empty goTarget closes the sheet and stops there.
      go: active ? null : "set-ui-language",
      extra: { langCode: code },
      trailing: active
        ? Skeletons.Image.Svg({
            ico: "desktop_check",
            className: `${fig}__msheet-check`,
          })
        : null,
    });
  });

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
    heading(fig, LOCALE.LANGUAGE),
    ...languageRows,
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
