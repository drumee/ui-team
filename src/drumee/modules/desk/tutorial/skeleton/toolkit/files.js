/**
 * The workspace Files pane, as the tour draws it.
 *
 * Figma 176:42043 / 142:35805 (the pane), 176:47527 → 180:49990 (the import
 * dialog over it). This is the 2.0 replacement for `toolkit/folder.js`'s
 * folder window: a filter bar, an empty-state hero, and the Team Chat panel
 * docked on the right.
 *
 * It is shared scenery — the migrate, task, share and meet steps all sit on
 * it — so it is keyed on `ui.fig.group` ("tutorial") rather than on any one
 * step's family, and styled once in skin/files.scss. A component keyed on
 * fig.family would silently lose its styles the moment a second step used it.
 *
 * Visual only — no services.
 */

// Filter chips, in the design's order. The first is the active one.
const FILTERS = [
  () => LOCALE.ALL,
  () => LOCALE.DOCS,
  () => LOCALE.PDF,
  () => LOCALE.IMAGES,
  () => LOCALE.OTHER,
];

// The "+ New" dropdown (Figma 142:35805). Same four kinds, same order and the
// same icons as the real create menu, so the tour teaches the menu the user
// will meet.
const NEW_ITEMS = [
  { ico: "addmenu-folder", label: () => LOCALE.FOLDER },
  { ico: "addmenu-document", label: () => LOCALE.DOCUMENT },
  { ico: "addmenu-spreadsheet", label: () => LOCALE.SPREADSHEET },
  { ico: "addmenu-presentation", label: () => LOCALE.PRESENTATION },
];

// The docked chat panel renders as loading placeholders in every Files frame —
// the design uses it to say "there is a conversation here" without putting a
// second thing to read on a screen that is teaching files. `own` rows are the
// salmon outgoing bubbles.
const CHAT_ROWS = [
  { own: false, lines: 2 },
  { own: false, lines: 2 },
  { own: true, lines: 3 },
  { own: false, lines: 3 },
  { own: false, lines: 2 },
  { own: true, lines: 3 },
];

const pfx = (ui) => `${ui.fig.group}__fp`;

function toolbar(ui) {
  const p = pfx(ui);
  return Skeletons.Box.X({ active: 0,
    className: `${p}-toolbar`,
    kids: [
      Skeletons.Box.X({ active: 0,
        className: `${p}-filters`,
        kids: FILTERS.map((label, i) =>
          Skeletons.Note({ active: 0,
            className: `${p}-filter`,
            dataset: { active: i === 0 ? 1 : 0 },
            attrOpt: { "data-active": i === 0 ? 1 : 0 },
            content: label(),
          }),
        ),
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
            className: `${p}-new-btn`,
            sys_pn: "fp-new-btn",
            partHandler: ui,
            kids: [
              Skeletons.Image.Svg({ active: 0, ico: "topbar-add", className: `${p}-new-ico` }),
              Skeletons.Note({ active: 0, className: `${p}-new-label`, content: LOCALE.NEW }),
            ],
          }),
          Skeletons.Image.Svg({ active: 0, ico: "view-group", className: `${p}-view` }),
          Skeletons.Image.Svg({ active: 0, ico: "view-list", className: `${p}-view` }),
          Skeletons.Image.Svg({ active: 0,
            ico: "view-grid",
            className: `${p}-view`,
            dataset: { active: 1 },
            attrOpt: { "data-active": 1 },
          }),
        ],
      }),
    ],
  });
}

/**
 * The empty-state hero. `migrate` is the part the migrate tour points at
 * before its dialog opens.
 */
function hero(ui) {
  const p = pfx(ui);
  return Skeletons.Box.Y({ active: 0,
    className: `${p}-hero`,
    kids: [
      Skeletons.Note({ active: 0, className: `${p}-hero-title`, content: LOCALE.FILES_HERO_TITLE }),
      Skeletons.Note({ active: 0, className: `${p}-hero-desc`, content: LOCALE.FILES_HERO_DESC }),
      Skeletons.Box.X({ active: 0,
        className: `${p}-hero-actions`,
        kids: [
          Skeletons.Box.X({ active: 0,
            className: `${p}-cta`,
            sys_pn: "fp-migrate",
            partHandler: ui,
            kids: [
              Skeletons.Note({ active: 0,
                className: `${p}-cta-label`,
                content: LOCALE.MIGRATE_FROM_GOOGLE_DRIVE,
              }),
            ],
          }),
          Skeletons.Box.X({ active: 0,
            className: `${p}-ghost`,
            kids: [
              Skeletons.Image.Svg({ active: 0, ico: "topbar-add", className: `${p}-ghost-ico` }),
              Skeletons.Note({ active: 0, className: `${p}-ghost-label`, content: LOCALE.NEW }),
            ],
          }),
          Skeletons.Box.X({ active: 0,
            className: `${p}-ghost`,
            kids: [
              Skeletons.Image.Svg({ active: 0, ico: "desktop_upload", className: `${p}-ghost-ico` }),
              Skeletons.Note({ active: 0, className: `${p}-ghost-label`, content: LOCALE.UPLOAD }),
            ],
          }),
        ],
      }),
    ],
  });
}

/** The + New dropdown, hung off the hero's own New button. */
function newMenu(ui) {
  const p = pfx(ui);
  return Skeletons.Box.Y({ active: 0,
    className: `${p}-new-menu`,
    sys_pn: "fp-new-menu",
    partHandler: ui,
    kids: NEW_ITEMS.map((item, i) =>
      Skeletons.Box.X({ active: 0,
        className: `${p}-new-item`,
        dataset: { active: i === 0 ? 1 : 0 },
        attrOpt: { "data-active": i === 0 ? 1 : 0 },
        kids: [
          Skeletons.Image.Svg({ active: 0, ico: item.ico, className: `${p}-new-item-ico` }),
          Skeletons.Note({ active: 0, className: `${p}-new-item-label`, content: item.label() }),
        ],
      }),
    ),
  });
}

function chatPlaceholder(ui) {
  const p = pfx(ui);
  return Skeletons.Box.Y({ active: 0,
    className: `${p}-chat`,
    sys_pn: "fp-chat",
    partHandler: ui,
    kids: [
      Skeletons.Box.X({ active: 0,
        className: `${p}-chat-head`,
        kids: [
          Skeletons.Note({ active: 0, className: `${p}-chat-title`, content: LOCALE.FOLDER_SCOPED_CHAT }),
          Skeletons.Image.Svg({ active: 0, ico: "magnifying-glass", className: `${p}-chat-ico` }),
        ],
      }),
      Skeletons.Box.Y({ active: 0,
        className: `${p}-chat-body`,
        kids: CHAT_ROWS.map((row) =>
          Skeletons.Box.Y({ active: 0,
            className: `${p}-chat-row`,
            dataset: { own: row.own ? 1 : 0 },
            attrOpt: { "data-own": row.own ? 1 : 0 },
            kids: [
              Skeletons.Box.Y({ active: 0,
                className: `${p}-chat-bubble`,
                kids: Array.from({ length: row.lines }, (_v, i) =>
                  Skeletons.Box.Y({ active: 0,
                    className: `${p}-chat-line`,
                    // The last line of a placeholder paragraph is short, which
                    // is what stops the panel reading as a block of bars.
                    dataset: { short: i === row.lines - 1 ? 1 : 0 },
                    attrOpt: { "data-short": i === row.lines - 1 ? 1 : 0 },
                  }),
                ),
              }),
            ],
          }),
        ),
      }),
      Skeletons.Box.X({ active: 0,
        className: `${p}-chat-composer`,
        kids: [
          Skeletons.Note({ active: 0,
            className: `${p}-chat-composer-text`,
            content: LOCALE.TYPE_MESSAGE,
          }),
        ],
      }),
    ],
  });
}

/**
 * @param {Object} ui
 * @param {Object} [opt]
 * @param {Boolean} [opt.menu] draw the + New dropdown open
 *
 * A step that lays its own UI over this pane (the import dialog) composes the
 * two as siblings rather than passing an overlay in here, so this stays one
 * job: draw the pane.
 * @returns {Object} the whole pane
 */
function filesPane(ui, opt = {}) {
  const p = pfx(ui);
  return Skeletons.Box.X({ active: 0,
    className: `${p}-pane`,
    kids: [
      Skeletons.Box.Y({ active: 0,
        className: `${p}-main`,
        sys_pn: "fp-main",
        partHandler: ui,
        kids: [
          toolbar(ui),
          Skeletons.Box.Y({ active: 0,
            className: `${p}-body`,
            kids: [hero(ui), opt.menu ? newMenu(ui) : null].filter(Boolean),
          }),
        ],
      }),
      chatPlaceholder(ui),
    ],
  });
}

module.exports = { filesPane, newMenu, FILTERS, NEW_ITEMS };
