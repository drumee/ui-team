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

const { orgOnly } = require("../org");
// The preview shows a real workspace, so it draws the REAL Files grid rather
// than a second, hand-made approximation of one. Keeping a separate miniature
// meant two mocks of the same screen drifting apart — and the frame's preview
// is legible enough that the difference showed.
const { filesGrid } = require("./files-grid");

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
      Skeletons.Box.X({ active: 0,
        className: `${p}-cta`,
        sys_pn: "home-cta",
        partHandler: ui,
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
              // The topbar: the org chip and the crumb, as shapes. Org is
              // gated off in the tour's own chrome, but this is a picture of
              // the product rather than the tour's own bar — so it keeps the
              // shape and says nothing.
              Skeletons.Box.X({ active: 0,
                className: `${p}-pv-topbar`,
                kids: [
                  Skeletons.Box.Y({ active: 0, className: `${p}-pv-topbar-chip` }),
                  Skeletons.Box.Y({ active: 0, className: `${p}-pv-topbar-crumb` }),
                ],
              }),
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
    kids: [
      hero(ui),
      preview(ui),
      // The design titles the canvas with the organisation's name above the
      // hero. Gated off with the rest of the org chrome — see ../org.js.
      orgOnly(() =>
        Skeletons.Note({ active: 0,
          className: `${p}-org`,
          content: Organization.name(),
        }),
      ),
    ].filter(Boolean),
  });
}

module.exports = { orgHome };
