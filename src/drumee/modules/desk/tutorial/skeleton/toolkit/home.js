/**
 * The home empty state a workspace is created from — Figma 140:22684, the
 * frame the "org home -> create wp" flow opens on.
 *
 * A hero on the left (headline, one paragraph, and the CTA that opens the
 * create dialog) and a preview card on the right showing what a workspace
 * looks like once it exists. The rail beside it carries only the org's Dept.
 * entry — no workspace tabs, because none is open yet.
 *
 * The preview card is scenery: a scaled-down workspace frame, drawn from
 * shapes rather than from a bitmap so it follows the theme. It is deliberately
 * approximate — its job is to read as "a workspace, full of things" at a
 * glance, not to be legible.
 *
 * Note on fidelity: this frame carries no callout of its own — it is the entry
 * state the flow arrow leaves from. Everything drawn here is the design's; the
 * sentence the tour puts on it is ours.
 *
 * Visual only — no services. `home-cta` is what the callout points at.
 */

// The preview shows a real workspace, so it draws the REAL Files grid rather
// than a second, hand-made approximation of one. Keeping a separate miniature
// meant two mocks of the same screen drifting apart — and the frame's preview
// is legible enough that the difference showed.
const { filesGrid } = require("./files-grid");
// The area-tinted workspace shape. Returns an HTML STRING, hence Element +
// content rather than Image.Svg + ico — the same note as skeleton/topbar.js.
const folderArt = require("media/grid/template/folder");

// The rail inside the preview. Same entries as the full one; drawn here rather
// than composed from ./sidebar because that composer keys its classes on the
// HOST's family (tutorial-main) and this is rendered by a step.
const PREVIEW_RAIL = [
  { ico: "rail-files", label: () => LOCALE.FILES, active: true },
  { ico: "rail-chat", label: () => LOCALE.CHAT },
  { ico: "rail-task", label: () => LOCALE.TASK },
  { ico: "rail-meet", label: () => LOCALE.MEET },
  { ico: "rail-access", label: () => LOCALE.ACCESS },
];

// How far the miniature is scaled down inside the card. The app is composed at
// its real width and shrunk, so the grid inside is the same tree the full
// screens render — see __home-pv-scale in skin/files.scss.
const PREVIEW_WIDTH = 1280;

const pfx = (ui) => `${ui.fig.group}__home`;

/** The left column: headline, paragraph, CTA. */
function hero(ui) {
  const p = pfx(ui);
  return Skeletons.Box.Y({ active: 0,
    className: `${p}-hero`,
    kids: [
      Skeletons.Note({ active: 0,
        className: `${p}-title`,
        content: LOCALE.HOME_HERO_TITLE,
      }),
      Skeletons.Note({ active: 0,
        className: `${p}-desc`,
        content: LOCALE.HOME_HERO_DESC,
      }),
      // The one live control on this screen, and the only one in the tour that
      // is not on a callout.
      //
      // 140:22684 carries no callout — it is the state the flow arrow leaves
      // FROM — so the step raises it bare (`bare` in ../../workspace/index.js)
      // and this button carries the tour forward instead. That is also what it
      // does in the product: it opens the create dialog, which is the very
      // thing screen 2 draws.
      //
      // NOT `active: 0`, unlike everything else in this file: ui-core binds an
      // onclick only to a widget that is not inert, and the click has to reach
      // the STEP (`uiHandler`), whose onUiEvent already knows `next-step`. The
      // label inside stays inert so the click lands on this box.
      Skeletons.Box.X({
        className: `${p}-cta`,
        sys_pn: "home-cta",
        partHandler: ui,
        service: "next-step",
        uiHandler: [ui],
        kids: [
          Skeletons.Note({ active: 0,
            className: `${p}-cta-label`,
            content: LOCALE.CREATE_FIRST_WORKSPACE,
          }),
        ],
      }),
    ],
  });
}

// The mini topbar's utility cluster, in the order the frames put it.
const PREVIEW_UTILS = ["top-bell", "top-calendar", "top-inbox", "top-contacts", "top-trash", "top-apps"];

/**
 * The window's own topbar, as the base image draws it (176:40744, the render
 * sitting on the plate): the org pill, then the department, then the workspace
 * crumb, then the utility cluster.
 *
 * This was two grey blobs standing in for "a chip and a crumb". It is a
 * PICTURE OF THE PRODUCT, and the product's bar is the thing the tour's own bar
 * draws — so it is built from the same parts and the same numbers rather than
 * gestured at. The scale (0.62) is what makes it read as a miniature; drawing
 * it as blobs made it read as a wireframe.
 *
 * Composed here rather than pulled from ../topbar.js for the reason the rail
 * beside it is: that composer keys every class on the HOST's family
 * (tutorial-main) and this is rendered by a step.
 *
 * The department segment has no counterpart in the tour's own bar — nothing
 * outside this picture teaches departments yet (see ../org.js) — so it exists
 * only here, which is exactly what a picture of the product is for.
 */
function previewTopbar(ui) {
  const p = pfx(ui);

  const org = Skeletons.Box.X({ active: 0,
    className: `${p}-pv-tb-org`,
    kids: [
      Skeletons.Box.Y({ active: 0,
        className: `${p}-pv-tb-org-avatar`,
        kids: [
          Skeletons.Note({ active: 0,
            className: `${p}-pv-tb-org-avatar-text`,
            content: (Organization.name() || "").charAt(0),
          }),
        ],
      }),
      Skeletons.Note({ active: 0, className: `${p}-pv-tb-org-name`, content: Organization.name() }),
      Skeletons.Note({ active: 0,
        className: `${p}-pv-tb-org-plan`,
        content: require("libs/billing").planLabel(),
      }),
      Skeletons.Image.Svg({ active: 0, ico: "ph-caret-down", className: `${p}-pv-tb-caret` }),
    ],
  });

  const dept = Skeletons.Box.X({ active: 0,
    className: `${p}-pv-tb-dept`,
    kids: [
      Skeletons.Box.Y({ active: 0,
        className: `${p}-pv-tb-dept-tile`,
        kids: [
          Skeletons.Image.Svg({ active: 0, ico: "rail-department", className: `${p}-pv-tb-dept-ico` }),
        ],
      }),
      Skeletons.Note({ active: 0,
        className: `${p}-pv-tb-dept-name`,
        // Not LOCALE.DEPARTMENT: that is the rail's short "Dept." tab label.
        // The bar names a department, the way it names an org and a workspace
        // either side of it.
        content: LOCALE.DEPARTMENT_NAME,
      }),
      Skeletons.Note({ active: 0, className: `${p}-pv-tb-dept-sep`, content: "/" }),
    ],
  });

  const crumb = Skeletons.Box.X({ active: 0,
    className: `${p}-pv-tb-crumb`,
    kids: [
      Skeletons.Element({ active: 0,
        className: `${p}-pv-tb-crumb-icon`,
        // A workspace, so `hub` — which is what gets it the area emblem the
        // base image shows on the coral shape. Private, matching the folders
        // in the grid below it.
        content: folderArt({
          area: _a.private,
          filetype: _a.hub,
          role: "desk",
          widgetId: _.uniqueId("tutorial-pv-crumb-"),
          isAttachment: 1,
        }),
      }),
      Skeletons.Note({ active: 0, className: `${p}-pv-tb-crumb-name`, content: LOCALE.WORKSPACE_NAME }),
      Skeletons.Image.Svg({ active: 0, ico: "ph-caret-down", className: `${p}-pv-tb-caret` }),
    ],
  });

  return Skeletons.Box.X({ active: 0,
    className: `${p}-pv-topbar`,
    kids: [
      org,
      dept,
      crumb,
      Skeletons.Box.X({ active: 0,
        className: `${p}-pv-tb-utils`,
        kids: [
          ...PREVIEW_UTILS.map((ico) =>
            Skeletons.Image.Svg({ active: 0, ico, className: `${p}-pv-tb-util` }),
          ),
          Skeletons.Box.Y({ active: 0, className: `${p}-pv-tb-avatar` }),
        ],
      }),
    ],
  });
}

/**
 * The right column: a workspace, in miniature.
 *
 * The card is a gradient plate with an app window sitting on it, clipped at
 * the right edge the way the frame lets it run off. Inside, the topbar and
 * rail are drawn at preview scale and the body is the real Files grid.
 */
function preview(ui) {
  const p = pfx(ui);

  const railItem = (item) =>
    Skeletons.Box.Y({ active: 0,
      className: `${p}-pv-rail-item`,
      dataset: { active: item.active ? 1 : 0 },
      attrOpt: { "data-active": item.active ? 1 : 0 },
      kids: [
        Skeletons.Box.Y({ active: 0,
          className: `${p}-pv-rail-tile`,
          kids: [
            Skeletons.Image.Svg({ active: 0, ico: item.ico, className: `${p}-pv-rail-ico` }),
          ],
        }),
        Skeletons.Note({ active: 0, className: `${p}-pv-rail-text`, content: item.label() }),
      ],
    });

  return Skeletons.Box.Y({ active: 0,
    className: `${p}-preview`,
    kids: [
      Skeletons.Box.Y({ active: 0,
        className: `${p}-pv-viewport`,
        kids: [
          Skeletons.Box.Y({ active: 0,
            className: `${p}-pv-scale`,
            style: { width: `${PREVIEW_WIDTH}px` },
            kids: [
              previewTopbar(ui),
              Skeletons.Box.X({ active: 0,
                className: `${p}-pv-app`,
                kids: [
                  Skeletons.Box.Y({ active: 0,
                    className: `${p}-pv-rail`,
                    kids: [
                      Skeletons.Image.Svg({ active: 0,
                        ico: "rail-logo",
                        className: `${p}-pv-rail-logo`,
                      }),
                      ...PREVIEW_RAIL.map(railItem),
                    ],
                  }),
                  // The real grid — folders with names, files with names and
                  // dates, the image tile and all.
                  filesGrid(ui, { area: _a.private }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

/**
 * @param {Object} ui
 * @returns {Object} the home empty state
 */
function orgHome(ui) {
  const p = pfx(ui);
  return Skeletons.Box.X({ active: 0,
    className: `${p}-canvas`,
    // The organisation is named ONCE, in the topbar chip the frame puts at the
    // top left (skeleton/topbar.js). This canvas used to repeat it above the
    // hero, which 140:22684 does not do — the frame goes straight from the rail
    // to the headline — and which had no skin behind it, so turning the org
    // chrome on rendered a bare unstyled line over the hero.
    kids: [hero(ui), preview(ui)],
  });
}

module.exports = { orgHome };
