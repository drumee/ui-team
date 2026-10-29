/**
 * Open-File Switcher panel (Figma "Drumee 2.0" 828:87909 expanded,
 * 873:221431 collapsed): title + collapse toggle, search, Create new file,
 * Recently viewed, Other files.
 *
 * Collapsed, the same sections are drawn icons-only; the rows keep their
 * file icon, and the search / create buttons shrink to square buttons.
 */
const nodeIconHtml = require("builtins/widget/chat/node-icon");
const { isDevDeployment } = require("builtins/window/skeleton/toolkit/new-menu-rows");

// The desk's "+ New" rows, in the same order: the Note, the Office files
// (made by the doc-editor service, `name` gives the kind) and, on the dev
// deployments only, the Casual editors ("Document lite" / "Spreadsheet
// lite"). A row with a `kind` launches that editor window on a new file in
// the listed folder.
const CREATE_OPTIONS = [
  { type: "note", kind: "editor_blocknote", ico: "raw-note-sticky", label: "NOTE" },
  { type: "document", name: "document.docx", ico: "addmenu-document", label: "DOCUMENT" },
  { type: "doc-lite", kind: "editor_docs", ico: "raw-documents_udoc", label: "DOCUMENT_LITE", casual: true },
  { type: "spreadsheet", name: "spreadsheet.xlsx", ico: "addmenu-spreadsheet", label: "SPREADSHEET" },
  { type: "sheet-lite", kind: "editor_sheet", ico: "raw-documents_usheet", label: "SPREADSHEET_LITE", casual: true },
  { type: "presentation", name: "presentation.pptx", ico: "addmenu-presentation", label: "PRESENTATION" },
];

/**
 * A note (filetype note / markdown — both open in the Note editor) is drawn
 * with the Note's own glyph, at the size the office glyphs use. The desk-grid
 * note card (a lined page with a pin, 82×110) shrunk to 30px read as a smudge
 * next to the Docs/Sheet icons (Duy, 2026-10-23).
 */
function isNote(node) {
  return node.filetype === _a.note || node.filetype === "markdown";
}

function fileIcon(ui, node) {
  const pfx = ui.fig.family;
  if (isNote(node)) {
    return Skeletons.Box.X({
      className: `${pfx}__row-icon ${pfx}__row-icon--note ${node.area || ""}`,
      kids: [Skeletons.Image.Svg({ ico: "raw-note-sticky", className: "preview-icon" })],
    });
  }
  return Skeletons.Element({
    className: `${pfx}__row-icon ${node.area || ""}`,
    // data-ext lets the skin whiten the office icons' page body, as the
    // chat attachment chip does.
    dataset: { ext: String(node.ext || "").toLowerCase() },
    content: nodeIconHtml(node, {
      area: node.area,
      prefix: "file-switcher-icon-",
      thumbnail: true,
    }),
  });
}

function fileRow(ui, node, section, current) {
  const pfx = ui.fig.family;
  const name = node.ext ? `${node.filename}.${node.ext}` : node.filename;
  return Skeletons.Box.X({
    className: `${pfx}__row${current ? ` ${pfx}__row--current` : ""}`,
    service: "open-file",
    uiHandler: [ui],
    nid: node.nid,
    hub_id: node.hub_id,
    // A web page opens in a new tab rather than a viewer (index openInTab).
    filetype: node.filetype,
    section,
    kids: [
      fileIcon(ui, node),
      Skeletons.Note({ className: `${pfx}__row-name`, content: name }),
    ],
  });
}

/** Rows of one section, or its empty line; `currentNid` is the open file. */
function rows(ui, list, section, empty, currentNid) {
  const pfx = ui.fig.family;
  if (!list.length) {
    return [Skeletons.Note({ className: `${pfx}__empty`, content: empty })];
  }
  return list.map((node) => fileRow(ui, node, section, node.nid === currentNid));
}

const LOADING_ROWS = 4;

/**
 * Placeholder rows for "Other files" while the folder listing is in flight:
 * the real row's geometry (30px icon + name), static and decorative.
 */
function loadingRows(ui, count = LOADING_ROWS) {
  const c = `${ui.fig.family}__row-skeleton`;
  const row = `<div class="${c}" aria-hidden="true"><div class="${c}-icon"></div><div class="${c}-line"></div></div>`;
  // The column lives in the markup: a Skeletons.Element is itself a row
  // flexbox at framework specificity.
  return [
    Skeletons.Element({
      className: `${c}-host`,
      content: `<div class="${c}s">${row.repeat(count)}</div>`,
    }),
  ];
}

/**
 * Rows of one section split into titled type groups (../groups), or its
 * empty line. Collapsed, the titles go with the names (skin).
 */
function groupedRows(ui, groups, section, empty, currentNid) {
  const pfx = ui.fig.family;
  if (!groups.length) {
    return [Skeletons.Note({ className: `${pfx}__empty`, content: empty })];
  }
  const out = [];
  for (const g of groups) {
    out.push(Skeletons.Note({
      className: `${pfx}__group`,
      content: LOCALE[g.label],
      dataset: { group: g.key },
    }));
    for (const node of g.items) out.push(fileRow(ui, node, section, node.nid === currentNid));
  }
  return out;
}

function section(ui, { ico, title, pn }) {
  const pfx = ui.fig.family;
  return Skeletons.Box.Y({
    className: `${pfx}__section`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__section-head`,
        kids: [
          Skeletons.Button.Svg({ ico, className: `${pfx}__section-ico` }),
          Skeletons.Note({ className: `${pfx}__section-title`, content: title }),
        ],
      }),
      Skeletons.Box.Y({ className: `${pfx}__list`, sys_pn: pn }),
    ],
  });
}

function __skl_file_switcher(ui) {
  const pfx = ui.fig.family;

  const head = Skeletons.Box.X({
    className: `${pfx}__head`,
    kids: [
      // Hidden while collapsed: the toggle below stands in for it there.
      Skeletons.Note({
        className: `${pfx}__title`,
        content: LOCALE.FILES,
        service: "expand-panel",
        uiHandler: [ui],
      }),
      // The one control left in the collapsed column (Figma 873:221431):
      // the same toggle, in place of the title, brings the panel back.
      Skeletons.Button.Svg({
        ico: "square-split-horizontal",
        className: `${pfx}__toggle`,
        service: "toggle-panel",
        uiHandler: [ui],
      }),
    ],
  });

  const search = Skeletons.Box.X({
    className: `${pfx}__search`,
    service: "expand-search",
    uiHandler: [ui],
    kids: [
      Skeletons.Button.Svg({ ico: "magnifying-glass", className: `${pfx}__search-ico` }),
      // interactive: filters per keystroke, read-only.
      Skeletons.Entry({
        className: `${pfx}__search-input`,
        name: "file-switcher-search",
        sys_pn: "search-input",
        placeholder: LOCALE.SEARCH_DOTS,
        interactive: 1,
        service: "search",
        uiHandler: [ui],
      }),
    ],
  });

  const create = ui.canCreate()
    ? Skeletons.Box.X({
      className: `${pfx}__create`,
      service: "toggle-create-menu",
      uiHandler: [ui],
      kids: [
        Skeletons.Button.Svg({ ico: "ph-plus", className: `${pfx}__create-ico` }),
        Skeletons.Note({ className: `${pfx}__create-label`, content: LOCALE.CREATE_NEW_FILE }),
      ],
    })
    : null;

  // The kinds of file "Create new file" offers — the office rows of the
  // desk "+ New" menu (window/skeleton/toolkit/new-menu-rows), same glyphs.
  const createMenu = create
    ? Skeletons.Box.Y({
      className: `${pfx}__create-menu`,
      kids: CREATE_OPTIONS.filter((o) => !o.casual || isDevDeployment()).map(({ type, name, kind, ico, label }) =>
        Skeletons.Box.X({
          className: `${pfx}__create-option ${pfx}__create-option--${type}`,
          service: kind ? "create-casual" : "create-file",
          uiHandler: [ui],
          name: name || kind,
          kids: [
            Skeletons.Button.Svg({ ico, className: `${pfx}__create-option-ico` }),
            Skeletons.Note({ className: `${pfx}__create-option-label`, content: LOCALE[label] }),
          ],
        })
      ),
    })
    : null;

  return Skeletons.Box.Y({
    debug: __filename,
    className: `${pfx}__main`,
    kids: [
      head,
      Skeletons.Box.Y({
        className: `${pfx}__actions`,
        kids: [search, create, createMenu],
      }),
      Skeletons.Box.Y({
        className: `${pfx}__scroll`,
        sys_pn: "scroll",
        kids: [
          section(ui, { ico: "ph-clock", title: LOCALE.RECENTLY_VIEWED, pn: "recent-list" }),
          Skeletons.Element({ className: `${pfx}__divider` }),
          section(ui, { ico: "rail-files", title: LOCALE.OTHER_FILES, pn: "other-list" }),
        ],
      }),
    ],
  });
}

__skl_file_switcher.rows = rows;
__skl_file_switcher.loadingRows = loadingRows;
__skl_file_switcher.LOADING_ROWS = LOADING_ROWS;
__skl_file_switcher.groupedRows = groupedRows;

module.exports = __skl_file_switcher;
