/* ==================================================================== *
 * desk_org_view skeleton — Figma 104:33055
 *
 * Header (org name / search / + New), then the organisation's workspaces in
 * one bare grid with no header of their own. Departments are not drawn here.
 * ==================================================================== */

// The area-tinted workspace glyph. An HTML STRING from the legacy grid
// template — the ONE place this app draws a folder — so it goes through
// Element + content. Passing markup as an icon NAME would build
// `<use href="#<markup>">` and render nothing (the breadcrumb learned this).
const folderArt = require("media/grid/template/folder");
const { isDevDeployment } = require("builtins/window/skeleton/toolkit/new-menu-rows");

/**
 * "12 [people]" — the count on a workspace card and in a section header.
 *
 * `tip` is OPTIONAL and must be an object, not a string. ui-core's
 * __addTooltips appends a <div> INSIDE the icon element and show()s it on
 * pointerenter; a bare string leaves that div with the default `tooltips`
 * class, which nothing styles — so it laid out as an ordinary flex child of
 * the 16px icon box and simply printed the label next to the glyph. The
 * className is what lets the skin lift it out of flow (see __tip).
 *
 * @param {String} pfx
 * @param {Number} value
 * @param {String} [tip] label; omit for no tooltip at all
 */
function members(pfx, value, tip) {
  return Skeletons.Box.X({
    className: `${pfx}__members`,
    // INERT, so a click here reaches whatever is behind it — on a card, that is
    // the card. See card() for the whole story.
    active: 0,
    kids: [
      Skeletons.Note({ active: 0, className: `${pfx}__members-value`, content: String(~~value) }),
      Skeletons.Image.Svg({
        ico: "ph-users",
        className: `${pfx}__members-ico`,
        // LIVE ONLY WHEN IT HAS A TOOLTIP, and that is not a free choice:
        // ui-core's `active` gate returns BEFORE __addTooltips(), so
        // `active: 0` on a widget silently takes its tooltip with it
        // (letc.js — `if (!active) return;` sits above the tooltips read).
        //
        // The department header's count is a bare number that needs the label;
        // the card's does not ask for one, and there the glyph must not eat the
        // click. So the two callers differ by exactly the flag that already
        // told them apart.
        ...(tip ? { tooltips: { content: tip, className: `${pfx}__tip` } } : { active: 0 }),
      }),
    ],
  });
}

/**
 * One workspace card.
 *
 * Carries only `wsHubId`, not the row. Spreading a server row onto a skeleton
 * would collide with the props the renderer itself reads — `name`, `id`,
 * `area` and `filetype` all mean something to Skeletons — so the widget keeps
 * the rows in a map and the card carries the key. Same shape as the topbar
 * switcher's rows (`cmd.mget("wsHubId")`).
 *
 * A PERSONAL card carries `wsNid` instead: every personal workspace shares the
 * user's own hub_id, so only the nid tells them apart. An OTHER card (a hub
 * the overview does not list) keeps `wsHubId` and adds `wsOther`, which tells
 * the widget which map to read it from. Neither draws a member count: a
 * desk.home row carries none, and a personal workspace has no members.
 *
 * @param {String} pfx
 * @param {Object} ui
 * @param {Object} ws an org_workspaces row, or a desk.home row
 * @param {String} [kind] "personal" | "other"; omitted for the org's own
 */
function card(pfx, ui, ws, kind) {
  const personal = kind === "personal";
  return Skeletons.Box.Y({
    className: `${pfx}__card`,
    // attrOpt, not dataset: a skeleton's `dataset` is dropped at render unless
    // an `attribute`/`attrOpt` map is passed too, so the area tint would never
    // have reached the DOM.
    attrOpt: { "data-area": ws.area || "" },
    ...(personal
      ? { wsNid: ws.nid || ws.id }
      : { wsHubId: ws.hub_id || ws.id, ...(kind === "other" ? { wsOther: 1 } : {}) }),
    service: "open-workspace",
    uiHandler: [ui],
    // EVERY DESCENDANT IS active: 0, or the card only opens from its padding.
    //
    // ui-core binds a click to any widget whose `active` is not 0, and that
    // handler calls `e.stopPropagation()` BEFORE it dispatches
    // (letc.js __handleClick). So a live child swallows the press: its own
    // triggerHandlers finds no ui handler and returns, the event never reaches
    // this box, and the glyph, the name and the member count were all dead
    // spots — which is most of the card's surface.
    //
    // `kidsOpt: { active: 0 }` IS NOT A SHORTCUT FOR THIS. It looks like one
    // and the org chip's chip() appears to use it, but mergeKidsOptions
    // rebuilds each kid into a LOCAL inside a `.map()` and never writes it back
    // (letc.js) — so the option is silently discarded and only an explicit flag
    // on each widget does anything. The chip works because it also sets
    // `active: 0` on every kid by hand.
    kids: [
      Skeletons.Element({
        active: 0,
        className: `${pfx}__card-icon ${ws.area || ""}`,
        content: folderArt({
          area: ws.area,
          filetype: _a.hub,
          role: "desk",
          widgetId: _.uniqueId("org-ws-"),
          // No kebab: the org view lists workspaces, it does not manage one.
          isAttachment: 1,
        }),
      }),
      Skeletons.Note({
        active: 0,
        className: `${pfx}__card-name`,
        content: ws.filename || ws.name || "",
      }),
      // Inert on both counts — see members(), which is why it takes no tip here.
      kind ? null : members(pfx, ws.members),
    ],
  });
}

/**
 * "3 workspaces" — the count group in a section header.
 *
 * @param {String} pfx
 * @param {Number} count
 */
function countGroup(pfx, count) {
  return Skeletons.Box.X({
    className: `${pfx}__section-count-group`,
    kids: [
      Skeletons.Note({ className: `${pfx}__section-count`, content: String(count) }),
      Skeletons.Note({
        className: `${pfx}__section-count-label`,
        content: count === 1 ? LOCALE.WORKSPACE : LOCALE.WORKSPACES,
      }),
    ],
  });
}

/**
 * One of the caller's own sections — "Other workspaces" or "Personal".
 *
 * A heading, a count and a grid, with nothing to manage: no rename, no
 * delete, no "+ New workspace" (these are not the organisation's), and no
 * member figure.
 * "Personal" is the heading the workspace switcher files personal workspaces
 * under (libs/workspace-groups); "Other workspaces" holds the hubs the
 * overview does not list, another organisation's mostly.
 *
 * @param {String} pfx
 * @param {Object} ui
 * @param {Array} rows desk.home rows, already filtered
 * @param {String} kind "personal" | "other"
 */
function mineSection(pfx, ui, rows, kind) {
  const count = rows.length;
  return Skeletons.Box.Y({
    className: `${pfx}__section ${pfx}__section--${kind}`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__section-head`,
        kids: [
          Skeletons.Box.Y({
            className: `${pfx}__section-id`,
            kids: [
              Skeletons.Box.X({
                className: `${pfx}__section-name-row`,
                kids: [
                  Skeletons.Note({
                    className: `${pfx}__section-name`,
                    content: kind === "personal" ? LOCALE.PERSONAL : LOCALE.OTHER_WORKSPACES,
                  }),
                ],
              }),
              Skeletons.Box.X({
                className: `${pfx}__section-meta`,
                kids: [countGroup(pfx, count)],
              }),
            ],
          }),
        ],
      }),
      count
        ? Skeletons.Box.G({
            className: `${pfx}__grid`,
            kids: rows.map((w) => card(pfx, ui, w, kind)),
          })
        : null,
    ],
  });
}

/**
 * Everything below the header: the organisation's workspaces, then the
 * caller's other workspaces and personal ones.
 *
 * NO DEPARTMENT SECTIONS. A workspace filed in a department is drawn in the
 * same bare grid as the rest — departments first, in their order, then the
 * ungrouped ones, which is the order the sections used to show them in — so
 * nothing the organisation holds drops off this screen.
 *
 * @param {String} pfx
 * @param {Object} ui
 * @param {Object} grouped {sections, ungrouped} from groupByDepartment
 * @param {Boolean} canManage unused since departments left this screen
 * @param {Array|null} [personal] null leaves the Personal section out
 * @param {Array|null} [others] null leaves the Other workspaces section out
 */
function sections(pfx, ui, grouped, canManage, personal, others) {
  const { sections: list, ungrouped } = grouped;
  const workspaces = [...list.flatMap((s) => s.workspaces), ...ungrouped];
  const kids = [];

  if (workspaces.length) {
    kids.push(
      Skeletons.Box.G({
        className: `${pfx}__grid ${pfx}__grid--ungrouped`,
        kids: workspaces.map((w) => card(pfx, ui, w)),
      }),
    );
  } else {
    kids.push(
      Skeletons.Note({
        className: `${pfx}__empty`,
        content: LOCALE.NO_WORKSPACES,
      }),
    );
  }

  // After the empty note, so an organisation with nothing in it still says
  // so: neither section is the organisation's. Other before Personal, the
  // switcher's order (hubs, then personal folders).
  if (others) kids.push(mineSection(pfx, ui, others, "other"));
  if (personal) kids.push(mineSection(pfx, ui, personal, "personal"));

  return kids;
}

/**
 * The "+ New" menu — "New workspace" and "Migrate from Google Drive".
 *
 * Both already exist as desk services and dispatch to the DESK, not here,
 * because that is where both already live (topbar.js raises the same two).
 * The frame's third row, "New department", is left out: departments are not
 * drawn on this screen.
 */
function newMenu(pfx, ui) {
  return Skeletons.Menu({
    className: `${pfx}__new-wrapper`,
    direction: _a.down,
    // See the note in desk/skeleton/topbar.js: without an explicit duration the
    // menu falls back to Visitor.timeout() milliseconds read as gsap seconds.
    duration: 0.01,
    opening: _e.click,
    persistence: _a.once,
    sys_pn: "new-menu",
    partHandler: [ui],
    trigger: Skeletons.Button.Label({
      // The app's own plus, not the Phosphor one. Both are square symbols, but
      // `topbar-add` is drawn on a 12x12 viewBox against ph-plus's 20x20 — the
      // skin's `svg { width: 20px; height: 20px }` scales either to the same
      // box, so the stroke reads a touch heavier, which is the point.
      ico: "topbar-add",
      className: `${pfx}__new-btn`,
      label: LOCALE.NEW,
    }),
    items: Skeletons.Box.Y({
      className: `${pfx}__new-menu-items`,
      kids: [
        Skeletons.Button.Label({
          ico: "app-folder",
          className: `${pfx}__new-menu-item`,
          label: LOCALE.NEW_WORKSPACE,
          service: "new-workspace-form",
          uiHandler: [ui],
        }),
        Skeletons.Button.Label({
          ico: "logo-google",
          className: `${pfx}__new-menu-item`,
          label: LOCALE.MIGRATE_GDRIVE_TITLE,
          service: "launch-gdrive-migration",
          uiHandler: [ui],
        }),
      ],
    }),
  });
}

module.exports = function (ui) {
  const pfx = ui.fig.family;

  return Skeletons.Box.Y({
    className: `${pfx}__main`,
    debug: __filename,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__header`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__title`,
            sys_pn: "org-title",
            partHandler: ui,
            content: Organization.name() || LOCALE.ORGANIZATION,
          }),
          Skeletons.Box.X({
            className: `${pfx}__header-actions`,
            kids: [
              // Figma 48:37106 draws the search as a 245x36 white pill, r12,
              // with the magnifier INSIDE at the left — not a bare input. The
              // icon is a sibling of the entry inside the pill, so the pill owns
              // the border and the entry itself is chromeless (see the skin).
              Skeletons.Box.X({
                className: `${pfx}__search-box`,
                kids: [
                  Skeletons.Image.Svg({
                    ico: "ph-magnifying-glass",
                    className: `${pfx}__search-ico`,
                  }),
                  // Filters the ALREADY-LOADED payload rather than calling a
                  // search service: overview returns the whole organisation in
                  // one read, so a round trip per keystroke would re-fetch data
                  // the client is holding. `watch` fires per keystroke, which is
                  // what makes the filter feel live.
                  Skeletons.Entry({
                    className: `${pfx}__search`,
                    sys_pn: "search",
                    placeholder: LOCALE.SEARCH_WORKSPACES,
                    watch: "filter-workspaces",
                    require: "any",
                    interactive: 1,
                    uiHandler: [ui],
                  }),
                ],
              }),
              // The "+ New" menu (workspace / migrate) is a dev
              // platform affordance for now: departments are still being
              // shaped, and this screen is the first one a production user
              // lands on. Production and preview show the search alone.
              ...(isDevDeployment() ? [newMenu(pfx, ui)] : []),
            ],
          }),
        ],
      }),
      Skeletons.Box.Y({
        className: `${pfx}__sections`,
        sys_pn: "sections",
        partHandler: ui,
      }),
    ],
  });
};

module.exports.sections = sections;
