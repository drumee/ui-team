/**
 * A workspace's Files pane with things in it — Figma 148:41197 onward, the
 * scenery the whole share flow sits on.
 *
 * The sibling `files.js` draws the EMPTY Files pane (the "Chat live in files"
 * hero). This one draws the populated grid: a folder row and a file grid under
 * the same toolbar. They are separate composers rather than one with a flag,
 * because a hero and a grid share only the bar above them.
 *
 * Shared scenery, so it is keyed on `ui.fig.group` and styled once in
 * skin/files-grid.scss — a component keyed on fig.family would silently lose
 * its styles the moment a second step used it.
 *
 * Visual only — no services.
 */

const FOLDERS = 4;

// Two rows of the same six, which is what the frames show.
//
// `kind` is the icon's TINT, not its glyph: the frames colour each file type
// (skin/files-grid.scss keys on it), and the sprite symbols are single-colour —
// four of them are authored fill="currentColor" and the rest inherit `fill` —
// so the colour has to come from the outside. The image tile has none: it draws
// artwork instead of an icon.
const FILES = [
  { ico: "app-doc-file", name: "spec_v2.docx", kind: "document" },
  { ico: "app-pdf-file", name: "spec_v2.pdf", kind: "pdf" },
  { ico: "addmenu-note", name: "note", kind: "note" },
  { ico: "addmenu-spreadsheet", name: "Spreadsheet", kind: "spreadsheet" },
  { ico: "addmenu-presentation", name: "Presentation", kind: "presentation" },
  { ico: "image", name: "bg_concept.png", art: true },
];

// Sample data, like the rest of the mock's fixtures.
const DATE = "Oct 12, 2023";
const FOLDER_LABEL = "Folders-name";

const pfx = (ui) => `${ui.fig.group}__fg`;

function toolbar(ui) {
  const p = pfx(ui);
  const chip = (label, on) =>
    Skeletons.Note({ active: 0,
      className: `${p}-filter`,
      dataset: { active: on ? 1 : 0 },
      attrOpt: { "data-active": on ? 1 : 0 },
      content: label,
    });

  return Skeletons.Box.X({ active: 0,
    className: `${p}-toolbar`,
    kids: [
      Skeletons.Box.X({ active: 0,
        className: `${p}-filters`,
        kids: [
          chip(LOCALE.ALL, true),
          chip(LOCALE.DOCS),
          chip(LOCALE.PDF),
          chip(LOCALE.IMAGES),
          chip(LOCALE.OTHER),
        ],
      }),
      Skeletons.Box.X({ active: 0,
        className: `${p}-search`,
        kids: [
          Skeletons.Image.Svg({ active: 0, ico: "magnifying-glass", className: `${p}-search-ico` }),
          Skeletons.Note({ active: 0, className: `${p}-search-text`, content: LOCALE.SEARCH }),
        ],
      }),
      Skeletons.Box.X({ active: 0,
        className: `${p}-tools`,
        kids: [
          Skeletons.Box.X({ active: 0,
            className: `${p}-new`,
            kids: [
              Skeletons.Image.Svg({ active: 0, ico: "topbar-add", className: `${p}-new-ico` }),
              Skeletons.Note({ active: 0, className: `${p}-new-label`, content: LOCALE.NEW }),
            ],
          }),
          Skeletons.Image.Svg({ active: 0, ico: "view-list", className: `${p}-view` }),
          Skeletons.Image.Svg({ active: 0,
            ico: "view-grid",
            className: `${p}-view`,
            dataset: { active: 1 },
            attrOpt: { "data-active": 1 },
          }),
          Skeletons.Image.Svg({ active: 0, ico: "chat-teardrop-dots", className: `${p}-view` }),
        ],
      }),
    ],
  });
}

/**
 * @param {Object} ui
 * @param {Object} [opt]
 * @param {String} [opt.area] the tint the folders carry. The share frames show
 *   an external (pink) workspace, which is the one you would be sharing from.
 * @returns {Object} the populated Files pane
 */
function filesGrid(ui, opt = {}) {
  const p = pfx(ui);
  const area = opt.area || _a.share;
  // The area-tinted shape, from the single source the desk renders it through.
  const folderArt = require("media/grid/template/folder");

  const fileTile = (f, row) =>
    Skeletons.Box.Y({ active: 0,
      className: `${p}-file`,
      kids: [
        Skeletons.Box.Y({ active: 0,
          className: `${p}-file-art`,
          dataset: { art: f.art ? 1 : 0 },
          attrOpt: { "data-art": f.art ? 1 : 0 },
          kids: f.art
            ? []
            : [
                Skeletons.Image.Svg({ active: 0,
                  ico: f.ico,
                  className: `${p}-file-ico`,
                  // dataset alone is dropped at render unless an attribute map
                  // rides along — the same pairing the rail's tiles need.
                  dataset: { kind: f.kind },
                  attrOpt: { "data-kind": f.kind },
                }),
              ],
        }),
        Skeletons.Note({ active: 0, className: `${p}-file-name`, content: f.name }),
        Skeletons.Note({ active: 0, className: `${p}-file-date`, content: DATE }),
      ],
    });

  return Skeletons.Box.Y({ active: 0,
    className: `${p}-pane`,
    kids: [
      toolbar(ui),
      Skeletons.Box.Y({ active: 0,
        className: `${p}-body`,
        kids: [
          Skeletons.Note({ active: 0, className: `${p}-label`, content: LOCALE.FOLDERS }),
          Skeletons.Box.X({ active: 0,
            className: `${p}-folders`,
            kids: Array.from({ length: FOLDERS }, (_v, i) =>
              Skeletons.Box.Y({ active: 0,
                className: `${p}-folder`,
                kids: [
                  Skeletons.Element({ active: 0,
                    className: `${p}-folder-art`,
                    // `hub`, not `folder`, and that is what the reference
                    // shows: the frames' Folders row is coral WITH the area
                    // emblem on it, which the template only draws for a hub —
                    // the same shape window-manager__icons-list gives a private
                    // workspace. A plain folder gets the shape and nothing on
                    // it, which is a different picture from the one the design
                    // is a render of.
                    //
                    // `isAttachment` still holds the kebab back. The frames
                    // show one; it is a context-menu trigger, and this grid is
                    // scenery with no menu behind it.
                    content: folderArt({
                      area,
                      filetype: _a.hub,
                      role: "desk",
                      widgetId: _.uniqueId(`tutorial-fg-${i}-`),
                      isAttachment: 1,
                    }),
                  }),
                  Skeletons.Note({ active: 0,
                    className: `${p}-folder-name`,
                    content: FOLDER_LABEL,
                  }),
                ],
              }),
            ),
          }),
          Skeletons.Note({ active: 0, className: `${p}-label`, content: LOCALE.FILES }),
          Skeletons.Box.X({ active: 0,
            className: `${p}-files`,
            kids: FILES.map((f) => fileTile(f, 0)),
          }),
          Skeletons.Box.X({ active: 0,
            className: `${p}-files`,
            kids: FILES.map((f) => fileTile(f, 1)),
          }),
        ],
      }),
    ],
  });
}

module.exports = { filesGrid, FILES };
