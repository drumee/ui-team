/**
 * The workspace Files pane, as the tour draws it.
 *
 * Figma 142:34981 ("Files") and 142:35805 ("open blank wp") — the same pane,
 * the second with the + New dropdown open. Both are 1600x1080 frames, and
 * every number below is theirs at 1:1, which is the scale the rest of the tour
 * is drawn at (the shell's rail is the frame's 64px, its topbar the frame's
 * 30+8). Where a number is derived rather than read, the derivation is noted.
 *
 * Frame geometry, for the skin to be read against:
 *
 *   pane row      main 992 + 8 gap + chat 512, inside the shell's 8px inset
 *   main          1px hairline, radius 8, 12px padding
 *   toolbar       964x35 — filter bar | search + New + view toggles (452 wide)
 *   gap           120px between the toolbar and the hero block
 *   hero          964x558, 120/80 insets, 32px rhythm, 48px buttons
 *   chat          512 wide: 58px head, bottom-aligned placeholder rows, 69px
 *                 composer
 *
 * It is the `migrate` step's ground — screens 1 and 2 are ABOUT it (the
 * Migrate CTA and the + New menu), and the three dialog screens sit on it — so
 * it is keyed on `ui.fig.group` ("tutorial") rather than on a step's family and
 * styled once in skin/files.scss. A component keyed on fig.family would
 * silently lose its styles the moment a second step used it.
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

// The three view toggles, in the frame's order. The third is the active one —
// the grid, which is what the pane behind it is showing.
// The frame names the first one "TreeView" (I142:35813;71:14318), which is the
// glyph `app-tree-view` is — so the tour teaches the toggle the user will meet.
const VIEWS = ["app-tree-view", "view-list", "view-grid"];

// The "+ New" dropdown (142:38624). Same four kinds, same order and the same
// icons as the real create menu, so the tour teaches the menu the user will
// meet. The frame carries two more rows (Note, Embed API Key) with Figma's
// `hidden` flag set, which is the designer saying they are not on this screen.
//
// `kind` is stamped on the row so the skin can tint the glyph. The four tints
// the frame uses — Primary/40, Primary/30, Signal/Success, Signal/Link share —
// are the product's own create-row palette (`new-menu-icon-tints` in
// skin/mixins/drumee.scss); that mixin is keyed on the folder flyout's own
// class vocabulary and so cannot be included here, but the values are its.
const NEW_ITEMS = [
  { kind: "folder", ico: "addmenu-folder", label: () => LOCALE.FOLDER },
  { kind: "document", ico: "addmenu-document", label: () => LOCALE.DOCUMENT },
  { kind: "spreadsheet", ico: "addmenu-spreadsheet", label: () => LOCALE.SPREADSHEET },
  { kind: "presentation", ico: "addmenu-presentation", label: () => LOCALE.PRESENTATION },
];

// The docked chat panel renders as loading placeholders in both Files frames —
// the design uses it to say "there is a conversation here" without putting a
// second thing to read on a screen that is teaching files.
//
// Seven rows, and the line widths are the frame's own: every bar is 296 wide
// (the bubble's 320 less its 12px insets) except the last line of a paragraph,
// which is short. Held as PERCENTAGES of that 296 so the panel keeps the
// design's ragged right edge at any width — the panel is 512 in the frame and
// narrower on a smaller tier.
//
// `own` rows are the salmon outgoing bubbles, and they carry no avatar and no
// name bar: the frame draws those only on incoming messages.
const pc = (w) => `${((w / 296) * 100).toFixed(1)}%`;
const CHAT_ROWS = [
  { own: false, lines: ["100%", pc(171)] },
  { own: false, lines: ["100%", "100%"] },
  { own: true, lines: ["100%", "100%", pc(192)] },
  { own: false, lines: ["100%", "100%"] },
  { own: false, lines: ["100%", "100%", pc(197)] },
  { own: false, lines: ["100%", pc(115)] },
  { own: true, lines: ["100%", "100%", pc(192)] },
];

// Every placeholder timestamp in the frame reads the same time. It is a mock of
// a conversation, not a clock, and a real `new Date()` here would make the
// screenshot in a bug report disagree with the one in the design.
const STAMP = "11:53 AM";

const pfx = (ui) => `${ui.fig.group}__fp`;

/**
 * The headline, split on newlines.
 *
 * The frame breaks it by hand — 142:35815 is two lines, "Chat live in files."
 * over "No more context loss." — and that break is part of the composition.
 * Left to wrap, it breaks after "No" instead: the phrase is ~1100px at 64/600
 * against a 676px column, so the natural break lands mid-sentence.
 *
 * One Note per line keeps the design's break for the language it was drawn in
 * while leaving every other translation free to break where its own words need
 * to — a locale with no "\n" in it renders as one line and wraps. Same rule and
 * same reason as `titleLines` in ./empty-state.js.
 */
const titleLines = (text) => String(text || "").split("\n");

function toolbar(ui) {
  const p = pfx(ui);
  return Skeletons.Box.X({ active: 0,
    className: `${p}-toolbar`,
    kids: [
      // The frame wraps the chips in a filled bar of their own (radius 8 with
      // 4px around them), which is what the active chip's radius-6 pill sits
      // inside. It is not a row of bare chips.
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

      // 452 wide as a group, and the search field is the only part of it that
      // flexes — the New button and the toggles are their content's width.
      Skeletons.Box.X({ active: 0,
        className: `${p}-actions`,
        kids: [
          Skeletons.Box.X({ active: 0,
            className: `${p}-search`,
            kids: [
              Skeletons.Image.Svg({ active: 0, ico: "magnifying-glass", className: `${p}-search-ico` }),
              // The frame's placeholder carries the ellipsis; the locale key is
              // the bare noun, since it is also a button label elsewhere.
              Skeletons.Note({ active: 0, className: `${p}-search-text`, content: `${LOCALE.SEARCH}...` }),
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
              // One bordered group with three cells in it, not three loose
              // buttons: the frame draws a single rounded container and clips
              // the cells to it, which is why the active cell's own radius only
              // shows on its outer corners.
              Skeletons.Box.X({ active: 0,
                className: `${p}-views`,
                kids: VIEWS.map((ico, i) =>
                  Skeletons.Box.Y({ active: 0,
                    className: `${p}-view`,
                    dataset: { active: i === VIEWS.length - 1 ? 1 : 0 },
                    attrOpt: { "data-active": i === VIEWS.length - 1 ? 1 : 0 },
                    kids: [
                      Skeletons.Image.Svg({ active: 0, ico, className: `${p}-view-ico` }),
                    ],
                  }),
                ),
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

/**
 * The empty-state hero.
 *
 * `fp-migrate` is what the migrate tour's first screen lights — the CTA the
 * import dialog opens from. `fp-hero-new` is the second screen's: the + New
 * button, which the dropdown hangs off.
 *
 * A button is scenery by default and a CONTROL when the caller names a service
 * for it. `active: 0` and a service are mutually exclusive, not merely
 * different — ui-core binds an onclick to a widget only while it is not inert —
 * so each is a branch rather than an extra flag. The label and icon inside stay
 * inert either way, so the click lands on the button and not on its contents.
 * Same shape as `es-cta` in ./empty-state.js and `home-cta` in ./home.js.
 *
 * @param {Object} ui
 * @param {Object} [opt]
 * @param {Boolean} [opt.menu] draw the + New dropdown open under the New button
 * @param {String} [opt.cta_service] makes "Migrate from Google Drive" raise
 *   this service at `ui`. The migrate tour's first screen carries no callout —
 *   the frame has none — so these three buttons are its only way forward.
 * @param {String} [opt.new_service] makes the hero's "+ New" raise this one
 * @param {String} [opt.upload_service] and this one makes "Upload" a control.
 *   Named separately from `new_service` because the two ghosts share the
 *   `-ghost` class: only a `sys_pn` and a service tell them apart.
 */
function hero(ui, opt = {}) {
  const p = pfx(ui);
  const { menu, cta_service, new_service, upload_service } = opt;
  // A button's props: inert, or clickable and stamped as such so the skin can
  // say so. Stamped from the same flag that makes it clickable, so the two
  // cannot disagree — and keyed on that rather than on the tour, since these
  // screens also run inside `full`, where `data-tour` is "full".
  const control = (service) => (service
    ? { service, uiHandler: [ui], dataset: { live: 1 }, attrOpt: { "data-live": 1 } }
    : { active: 0 });
  return Skeletons.Box.Y({ active: 0,
    className: `${p}-hero`,
    kids: [
      Skeletons.Box.Y({ active: 0,
        className: `${p}-hero-title`,
        kids: titleLines(LOCALE.FILES_HERO_TITLE).map((line) =>
          Skeletons.Note({ active: 0, className: `${p}-hero-title-line`, content: line }),
        ),
      }),
      Skeletons.Note({ active: 0, className: `${p}-hero-desc`, content: LOCALE.FILES_HERO_DESC }),
      Skeletons.Box.X({ active: 0,
        className: `${p}-hero-actions`,
        kids: [
          Skeletons.Box.X({
            ...control(cta_service),
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
          // The dropdown is a CHILD of this button rather than a sibling
          // positioned off the hero.
          //
          // 142:38624 sits at x436/y657 in the frame and the button's own box
          // is x436/y605-653 — the menu's left edge is the button's left edge
          // and its top is 4px under the button's bottom. Hung off the button,
          // that is `left: 0; top: calc(100% + 4px)` and it stays true at every
          // width; measured off the hero instead it is two magic numbers that
          // are right at 1600 and wrong everywhere else.
          //
          // `position: relative` opens no stacking context, so the spotlight's
          // promotion still reaches the menu (spotlight/index.js _light).
          Skeletons.Box.X({
            ...control(new_service),
            className: `${p}-ghost`,
            sys_pn: "fp-hero-new",
            partHandler: ui,
            kids: [
              Skeletons.Image.Svg({ active: 0, ico: "app-add", className: `${p}-ghost-ico` }),
              Skeletons.Note({ active: 0, className: `${p}-ghost-label`, content: LOCALE.NEW }),
              menu ? newMenu(ui) : null,
            ].filter(Boolean),
          }),
          // Named, so a screen can point at it — the migrate tour's upload
          // screen lights this button and hangs its callout off its right
          // edge. It was anonymous while nothing pointed at it.
          Skeletons.Box.X({
            ...control(upload_service),
            className: `${p}-ghost`,
            sys_pn: "fp-hero-upload",
            partHandler: ui,
            kids: [
              Skeletons.Image.Svg({ active: 0, ico: "app-upload", className: `${p}-ghost-ico` }),
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
        // The first row carries the frame's hover fill; `kind` picks the
        // glyph's tint. dataset alone is dropped at render unless an attribute
        // map rides along, so both are spelled out.
        dataset: { active: i === 0 ? 1 : 0, kind: item.kind },
        attrOpt: { "data-active": i === 0 ? 1 : 0, "data-kind": item.kind },
        kids: [
          Skeletons.Image.Svg({ active: 0, ico: item.ico, className: `${p}-new-item-ico` }),
          Skeletons.Note({ active: 0, className: `${p}-new-item-label`, content: item.label() }),
        ],
      }),
    ),
  });
}

/** One placeholder message: bars where a real panel has words. */
function chatRow(ui, row) {
  const p = pfx(ui);
  const bubble = Skeletons.Box.Y({ active: 0,
    className: `${p}-chat-bubble`,
    kids: [
      Skeletons.Box.Y({ active: 0,
        className: `${p}-chat-lines`,
        kids: row.lines.map((w) =>
          Skeletons.Box.Y({ active: 0, className: `${p}-chat-line`, style: { width: w } }),
        ),
      }),
    ],
  });
  // The stamp is inside the message column, under the bubble — and on an own
  // message the column is right-aligned, which is what puts it under the
  // bubble's right edge (142:35899, x406 of 447).
  const stack = Skeletons.Box.Y({ active: 0,
    className: `${p}-chat-stack`,
    kids: [
      bubble,
      Skeletons.Note({ active: 0, className: `${p}-chat-stamp`, content: STAMP }),
    ],
  });

  if (row.own) {
    return Skeletons.Box.Y({ active: 0,
      className: `${p}-chat-row`,
      dataset: { own: 1 },
      attrOpt: { "data-own": 1 },
      kids: [stack],
    });
  }

  // Incoming: the avatar hangs outside the message's own column, so the bubble
  // is indented past it (142:35833 — a 24px ellipse, then the column at x32).
  return Skeletons.Box.X({ active: 0,
    className: `${p}-chat-row`,
    dataset: { own: 0 },
    attrOpt: { "data-own": 0 },
    kids: [
      Skeletons.Box.Y({ active: 0, className: `${p}-chat-avatar` }),
      Skeletons.Box.Y({ active: 0,
        className: `${p}-chat-col`,
        kids: [
          Skeletons.Box.Y({ active: 0, className: `${p}-chat-name` }),
          stack,
        ],
      }),
    ],
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
          Skeletons.Box.X({ active: 0,
            className: `${p}-chat-head-tools`,
            kids: ["apps-dots-vertical", "magnifying-glass", "caret-right"].map((ico) =>
              Skeletons.Box.Y({ active: 0,
                className: `${p}-chat-head-btn`,
                kids: [Skeletons.Image.Svg({ active: 0, ico, className: `${p}-chat-head-ico` })],
              }),
            ),
          }),
        ],
      }),
      // Bottom-aligned and clipped: the frame's stream is anchored to the
      // composer and runs off the top of the panel, which is what a
      // conversation you have scrolled to the end of looks like.
      Skeletons.Box.Y({ active: 0,
        className: `${p}-chat-body`,
        kids: CHAT_ROWS.map((row) => chatRow(ui, row)),
      }),
      Skeletons.Box.X({ active: 0,
        className: `${p}-chat-composer`,
        kids: [
          Skeletons.Box.X({ active: 0,
            className: `${p}-chat-field`,
            kids: [
              Skeletons.Image.Svg({ active: 0, ico: "chat-link-simple", className: `${p}-chat-attach` }),
              Skeletons.Note({ active: 0,
                className: `${p}-chat-composer-text`,
                content: `${LOCALE.TYPE_MESSAGE}...`,
              }),
              Skeletons.Box.X({ active: 0,
                className: `${p}-chat-field-actions`,
                kids: [
                  Skeletons.Image.Svg({ active: 0, ico: "chat-action-smiley", className: `${p}-chat-smiley` }),
                  Skeletons.Image.Svg({ active: 0, ico: "send", className: `${p}-chat-send` }),
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
 * @param {Object} [opt]
 * @param {Boolean} [opt.menu] draw the + New dropdown open (142:35805)
 * @param {String} [opt.cta_service] make the Migrate CTA a control — see hero()
 * @param {String} [opt.new_service] make the hero's + New a control
 * @param {String} [opt.upload_service] make the hero's Upload a control
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
          Skeletons.Box.Y({ active: 0,
            className: `${p}-canvas`,
            kids: [toolbar(ui), hero(ui, opt)],
          }),
        ],
      }),
      chatPlaceholder(ui),
    ],
  });
}

module.exports = { filesPane, newMenu, FILTERS, NEW_ITEMS, CHAT_ROWS };
