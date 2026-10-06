/* ==================================================================== *
 * desk_org_view skeleton — Figma 104:33055
 *
 * Header (org or department name / + New department), then one section per
 * department, then the ungrouped workspaces in a bare row with no header of
 * their own.
 * ==================================================================== */

// The area-tinted workspace glyph. An HTML STRING from the legacy grid
// template — the ONE place this app draws a folder — so it goes through
// Element + content. Passing markup as an icon NAME would build
// `<use href="#<markup>">` and render nothing (the breadcrumb learned this).
const folderArt = require("media/grid/template/folder");

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
 * @param {String} pfx
 * @param {Object} ui
 * @param {Object} ws an org_workspaces row
 */
function card(pfx, ui, ws) {
  return Skeletons.Box.Y({
    className: `${pfx}__card`,
    // attrOpt, not dataset: a skeleton's `dataset` is dropped at render unless
    // an `attribute`/`attrOpt` map is passed too, so the area tint would never
    // have reached the DOM.
    attrOpt: { "data-area": ws.area || "" },
    wsHubId: ws.hub_id,
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
      members(pfx, ws.members),
    ],
  });
}

/**
 * One department section: header, then its grid.
 *
 * A department with no workspaces still renders its header and its
 * "+ New workspace" button — the frame draws exactly that for
 * "Department-name 3 / 0 workspace", and a section that hid itself when empty
 * would be one nobody could ever put anything into.
 *
 * @param {String} pfx
 * @param {Object} ui
 * @param {Object} section {department, workspaces}
 * @param {Boolean} canManage
 */
function departmentSection(pfx, ui, section, canManage) {
  const { department: d, workspaces } = section;
  const count = workspaces.length;
  return Skeletons.Box.Y({
    className: `${pfx}__section`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__section-head`,
        kids: [
          Skeletons.Box.Y({
            className: `${pfx}__section-id`,
            sys_pn: `dept-head:${d.id}`,
            partHandler: ui,
            kids: [
              Skeletons.Box.X({
                className: `${pfx}__section-name-row`,
                kids: [
                  Skeletons.Note({ className: `${pfx}__section-name`, content: d.name }),
                  canManage
                    ? Skeletons.Button.Svg({
                        ico: "ph-pencil-simple-line",
                        className: `${pfx}__section-rename`,
                        service: "rename-department",
                        deptId: d.id,
                        tooltips: { content: LOCALE.RENAME_DEPARTMENT, className: `${pfx}__tip` },
                        uiHandler: [ui],
                      })
                    : null,
                  canManage
                    ? Skeletons.Button.Svg({
                        ico: "ph-trash",
                        className: `${pfx}__section-delete`,
                        service: "delete-department",
                        deptId: d.id,
                        tooltips: { content: LOCALE.DELETE_DEPARTMENT, className: `${pfx}__tip` },
                        uiHandler: [ui],
                      })
                    : null,
                ],
              }),
              // Figma groups these: [count + "workspace"] at gap 4, then gap 12
              // to the member count. Flattening all three into one 12px row
              // pushed the number away from the word it belongs to.
              Skeletons.Box.X({
                className: `${pfx}__section-meta`,
                kids: [
                  Skeletons.Box.X({
                    className: `${pfx}__section-count-group`,
                    kids: [
                      Skeletons.Note({ className: `${pfx}__section-count`, content: String(count) }),
                      Skeletons.Note({
                        className: `${pfx}__section-count-label`,
                        content: count === 1 ? LOCALE.WORKSPACE : LOCALE.WORKSPACES,
                      }),
                    ],
                  }),
                  // The server's per-department member figure is a SUM across
                  // its workspaces, not a distinct head count — see the header
                  // of org_departments.sql for why yp cannot answer distinct
                  // here. The tooltip is what keeps the number honest.
                  members(pfx, d.member_count, LOCALE.MEMBERS),
                ],
              }),
            ],
          }),
          Skeletons.Button.Label({
            ico: "ph-plus",
            className: `${pfx}__section-new`,
            label: LOCALE.NEW_WORKSPACE,
            service: "new-workspace-in-department",
            deptId: d.id,
            uiHandler: [ui],
          }),
        ],
      }),
      count
        ? Skeletons.Box.G({
            className: `${pfx}__grid`,
            kids: workspaces.map((w) => card(pfx, ui, w)),
          })
        : null,
    ],
  });
}

/**
 * Everything below the header: the department sections, then the ungrouped
 * workspaces.
 *
 * THE UNGROUPED ROW HAS NO HEADER in the frame, and it must not grow one: it
 * is not a department, it has no name to rename and nothing to delete. It is
 * simply where every workspace that predates departments already lives, which
 * is why this feature needed no backfill.
 *
 * @param {String} pfx
 * @param {Object} ui
 * @param {Object} grouped {sections, ungrouped}
 * @param {Boolean} canManage
 */
function sections(pfx, ui, grouped, canManage) {
  const { sections: list, ungrouped } = grouped;
  const kids = list.map((s) => departmentSection(pfx, ui, s, canManage));

  if (ungrouped.length) {
    // A hint, ONLY when there is no department at all. The frame gives the
    // ungrouped row no header — it is the remainder that sits below the named
    // sections — but an organisation that has never made a department has
    // nothing but that remainder, and a bare wall of tiles does not explain
    // itself or hint that grouping exists. Once one department is created this
    // disappears and the row goes back to being the silent remainder.
    if (!list.length) {
      kids.push(
        Skeletons.Note({
          className: `${pfx}__ungrouped-hint`,
          content: LOCALE.NO_DEPARTMENTS_YET,
        }),
      );
    }
    kids.push(
      Skeletons.Box.G({
        className: `${pfx}__grid ${pfx}__grid--ungrouped`,
        kids: ungrouped.map((w) => card(pfx, ui, w)),
      }),
    );
  }

  if (!kids.length) {
    kids.push(
      Skeletons.Note({
        className: `${pfx}__empty`,
        content: LOCALE.NO_DEPARTMENTS_YET,
      }),
    );
  }

  return kids;
}

/**
 * The header — B2B Org Structure Figma 900:151138: the organisation's name and
 * one primary "+ New department" button. In the one-department view (Figma
 * "view multi wp inside org") the title is the department's, behind its cube.
 *
 * The earlier frame (104:33055) also carried a workspace search and a "+ New"
 * menu (department / workspace / Google Drive migration). The B2B frame drops
 * both: creating a workspace is the section's own "+ New workspace" or the
 * topbar switcher's "New workspaces", and the migration stays on the topbar's
 * "+ New".
 *
 * @param {String} pfx
 * @param {Object} ui
 * @param {Object} opt {title, department, canManage}
 */
function header(pfx, ui, opt) {
  return [
    Skeletons.Box.X({
      className: `${pfx}__title-row`,
      kids: [
        opt.department
          ? Skeletons.Box.X({
              className: `${pfx}__title-ico`,
              kids: [Skeletons.Image.Svg({ ico: "ph-cube", className: `${pfx}__title-ico-svg` })],
            })
          : null,
        Skeletons.Note({
          className: `${pfx}__title`,
          sys_pn: "org-title",
          content: opt.title,
        }),
      ],
    }),
    opt.canManage
      ? Skeletons.Button.Label({
          ico: "ph-plus",
          className: `${pfx}__new-btn`,
          label: LOCALE.NEW_DEPARTMENT,
          service: "new-department",
          uiHandler: [ui],
        })
      : null,
  ];
}

module.exports = function (ui) {
  const pfx = ui.fig.family;

  return Skeletons.Box.Y({
    className: `${pfx}__main`,
    debug: __filename,
    kids: [
      // Fed by _paintHeader once the overview resolves — the button depends
      // on can_manage, and the one-department title on the department list.
      Skeletons.Box.X({
        className: `${pfx}__header`,
        sys_pn: "header",
        partHandler: ui,
        kids: [
          Skeletons.Note({
            className: `${pfx}__title`,
            content: Organization.name() || LOCALE.ORGANIZATION,
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
module.exports.header = header;
