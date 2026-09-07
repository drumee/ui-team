/**
 * A WORKSPACE, IN MINIATURE — the gradient plate with an app window on it.
 *
 * Figma draws this twice: on the create-workspace flow's opening screen
 * (140:22684, a populated Files grid) and on the chat tour's opening screen
 * (142:39142, the same window showing a conversation). It was one component in
 * the design and two things in the code — a composed one here and a BITMAP in
 * the chat tour — which is the drift this file exists to stop.
 *
 * The window is composed at the app's REAL width and scaled down, so what it
 * shows is the same tree the full screens render rather than a second
 * miniature that can go stale. It follows the theme for the same reason a
 * screenshot cannot.
 *
 * Keyed on `ui.fig.group` ("tutorial"), not on a step's family: more than one
 * step draws it, and a component keyed on the family would silently lose its
 * styles the moment the second one used it.
 *
 * Scenery. Nothing here carries a service or a `sys_pn` — the callout points at
 * something outside the plate on both screens it appears on.
 */

// The area-tinted workspace shape, for the topbar's crumb. Returns an HTML
// STRING, hence Element + content rather than Image.Svg + ico: passing markup
// as an icon NAME builds `<use href="#<markup>">` and renders nothing.
const folderArt = require("media/grid/template/folder");
// The preview's default body: the REAL Files grid, not a second hand-made
// approximation of one.
const { filesGrid } = require("./files-grid");

const pfx = (ui) => `${ui.fig.group}__pv`;

// The rail inside the preview. Same entries as the full one; drawn here rather
// than composed from ./sidebar because that composer keys its classes on the
// HOST's family (tutorial-main) and this is rendered by a step.
const PREVIEW_RAIL = [
  { key: "files", ico: "rail-files", label: () => LOCALE.FILES },
  { key: "chat", ico: "rail-chat", label: () => LOCALE.CHAT },
  { key: "task", ico: "rail-task", label: () => LOCALE.TASK },
  { key: "meet", ico: "rail-meet", label: () => LOCALE.MEET },
  { key: "access", ico: "rail-access", label: () => LOCALE.ACCESS },
];

// How far the miniature is scaled down inside the card. The app is composed at
// its real width and shrunk, so the body inside is the same tree the full
// screens render — see __pv-scale in skin/preview.scss.
const PREVIEW_WIDTH = 1280;


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

  // A PLACEHOLDER, not the viewer's own organisation.
  //
  // This read Organization.name(), which on a real account puts that account's
  // org into a picture of the product — "Drumee stage server" where the frame
  // says "Org-name", beside a department and a workspace that are both
  // placeholders. One live segment among three sample ones does not read as
  // personalisation; it reads as a mistake, and it is the only string on the
  // plate that can be arbitrarily long.
  //
  // LOCALE.ORG_NAME is the same kind of key its two neighbours already use,
  // and it stands with them in the file.
  const orgName = LOCALE.ORG_NAME;
  const org = Skeletons.Box.X({ active: 0,
    className: `${p}-tb-org`,
    kids: [
      Skeletons.Box.Y({ active: 0,
        className: `${p}-tb-org-avatar`,
        kids: [
          Skeletons.Note({ active: 0,
            className: `${p}-tb-org-avatar-text`,
            content: (orgName || "").charAt(0),
          }),
        ],
      }),
      Skeletons.Note({ active: 0, className: `${p}-tb-org-name`, content: orgName }),
      Skeletons.Note({ active: 0,
        className: `${p}-tb-org-plan`,
        content: require("libs/billing").planLabel(),
      }),
      Skeletons.Image.Svg({ active: 0, ico: "ph-caret-down", className: `${p}-tb-caret` }),
    ],
  });

  const dept = Skeletons.Box.X({ active: 0,
    className: `${p}-tb-dept`,
    kids: [
      Skeletons.Box.Y({ active: 0,
        className: `${p}-tb-dept-tile`,
        kids: [
          Skeletons.Image.Svg({ active: 0, ico: "rail-department", className: `${p}-tb-dept-ico` }),
        ],
      }),
      Skeletons.Note({ active: 0,
        className: `${p}-tb-dept-name`,
        // Not LOCALE.DEPARTMENT: that is the rail's short "Dept." tab label.
        // The bar names a department, the way it names an org and a workspace
        // either side of it.
        content: LOCALE.DEPARTMENT_NAME,
      }),
      Skeletons.Note({ active: 0, className: `${p}-tb-dept-sep`, content: "/" }),
    ],
  });

  const crumb = Skeletons.Box.X({ active: 0,
    className: `${p}-tb-crumb`,
    kids: [
      Skeletons.Element({ active: 0,
        className: `${p}-tb-crumb-icon`,
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
      Skeletons.Note({ active: 0, className: `${p}-tb-crumb-name`, content: LOCALE.WORKSPACE_NAME }),
      Skeletons.Image.Svg({ active: 0, ico: "ph-caret-down", className: `${p}-tb-caret` }),
    ],
  });

  return Skeletons.Box.X({ active: 0,
    className: `${p}-topbar`,
    kids: [
      org,
      dept,
      crumb,
      Skeletons.Box.X({ active: 0,
        className: `${p}-tb-utils`,
        kids: [
          ...PREVIEW_UTILS.map((ico) =>
            Skeletons.Image.Svg({ active: 0, ico, className: `${p}-tb-util` }),
          ),
          Skeletons.Box.Y({ active: 0, className: `${p}-tb-avatar` }),
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
/**
 * @param {Object} ui
 * @param {Object} [opt]
 * @param {String} [opt.active="files"] which rail tab is lit — the tab whose
 *   screen the body is showing, so the miniature is internally consistent.
 * @param {Object} [opt.body] what sits beside the rail. Defaults to the Files
 *   grid, which is what the create-workspace flow's plate shows.
 * @param {String} [opt.fit] "card" to fill the box it is given instead of
 *   taking the home screen's own 705x475. The chat tour hands it a carousel
 *   card, which brings its own geometry.
 * @param {Number} [opt.w] the window's own width, when the default is wrong
 *   for what is on it. The meet card asks for one: its toolbar right-aligns a
 *   control, and at 1280 that control lands past the card's edge — a body
 *   whose own chrome has to END at the crop needs the window to end there too.
 * @returns {Object} the plate
 */
function appPreview(ui, opt = {}) {
  const p = pfx(ui);
  const { active = "files", body, fit, w } = opt;

  const railItem = (item) =>
    Skeletons.Box.Y({ active: 0,
      className: `${p}-rail-item`,
      dataset: { active: item.key === active ? 1 : 0 },
      attrOpt: { "data-active": item.key === active ? 1 : 0 },
      kids: [
        Skeletons.Box.Y({ active: 0,
          className: `${p}-rail-tile`,
          kids: [
            Skeletons.Image.Svg({ active: 0, ico: item.ico, className: `${p}-rail-ico` }),
          ],
        }),
        Skeletons.Note({ active: 0, className: `${p}-rail-text`, content: item.label() }),
      ],
    });

  return Skeletons.Box.Y({ active: 0,
    className: `${p}-plate`,
    dataset: { fit: fit || null },
    attrOpt: { "data-fit": fit || null },
    kids: [
      Skeletons.Box.Y({ active: 0,
        className: `${p}-viewport`,
        kids: [
          Skeletons.Box.Y({ active: 0,
            className: `${p}-scale`,
            style: { width: `${w || PREVIEW_WIDTH}px` },
            kids: [
              previewTopbar(ui),
              Skeletons.Box.X({ active: 0,
                className: `${p}-app`,
                kids: [
                  Skeletons.Box.Y({ active: 0,
                    className: `${p}-rail`,
                    kids: [
                      Skeletons.Image.Svg({ active: 0,
                        ico: "rail-logo",
                        className: `${p}-rail-logo`,
                      }),
                      ...PREVIEW_RAIL.map(railItem),
                    ],
                  }),
                  // The REAL screen, whichever one this plate is showing —
                  // the Files grid by default (folders with names, files with
                  // names and dates, the image tile and all), or whatever the
                  // caller composed. Never a second miniature of its own.
                  body || filesGrid(ui, { area: _a.private }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

module.exports = { appPreview, PREVIEW_RAIL, PREVIEW_WIDTH };
