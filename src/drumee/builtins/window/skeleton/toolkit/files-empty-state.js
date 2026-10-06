/**
 * The Files grid's empty state — Figma "wp view" 920:122879, pane 920:123317.
 *
 * Replaces the lone "No Folders or Files yet" note as the folder window's
 * List.Smart `evArgs` (toolkit/index.js gridFilesBrowser): ui-core mounts it
 * as the list's emptyView whenever the listing comes back empty.
 *
 * Three layers, all present in the markup, picked by CSS from positive stamps
 * on the window root (folder/skin/files-empty-state.scss):
 *   - hero heading     — always, unless a file-type tab is active;
 *   - action cards     — only under data-can-create="1" (same gate as "+ New",
 *                        folder/index.js syncNewCtrlVisibility). Fails closed;
 *   - filtered note    — only under data-file-filter: a PDF tab that matched
 *                        nothing is not an empty folder.
 *
 * The root keeps `no-content`: the list centring (window/skin/common.scss)
 * and the search hiding (folder/skin/icons-skeleton.scss) both key on it.
 *
 * Each card carries the very service the "+ New" menu row does
 * (toolkit/new-menu-rows.js), so the folder window's onUiEvent handles a card
 * click exactly like the menu row — over-limit guard included.
 */
const ICONS = {
  spreadsheet: require("assets/empty-states/es-spreadsheet.svg"),
  document: require("assets/empty-states/es-document.svg"),
  presentation: require("assets/empty-states/es-presentation.svg"),
  upload: require("assets/empty-states/es-upload.svg"),
  gdrive: require("assets/empty-states/es-gdrive.png"),
  scratch: require("assets/empty-states/es-scratch.png"),
};

/**
 * Card specs in Figma grid order (922:123559, 3 x 2).
 * A function, not a constant: `_e` and LOCALE are globals installed after
 * this module may first be required.
 * @returns {Array<{key:string, service:string, name?:string, title:string, desc?:string}>}
 */
function filesEmptyCards() {
  return [
    { key: "spreadsheet", service: "new-document", name: "spreadsheet.xlsx",
      title: LOCALE.FILES_EMPTY_ADD_SPREADSHEET, desc: LOCALE.FILES_EMPTY_ADD_SPREADSHEET_DESC },
    { key: "document", service: "new-document", name: "document.docx",
      title: LOCALE.FILES_EMPTY_ADD_DOCUMENT, desc: LOCALE.FILES_EMPTY_ADD_DOCUMENT_DESC },
    { key: "presentation", service: "new-document", name: "presentation.pptx",
      title: LOCALE.FILES_EMPTY_ADD_PRESENTATION, desc: LOCALE.FILES_EMPTY_ADD_PRESENTATION_DESC },
    { key: "upload", service: _e.upload,
      title: LOCALE.FILES_EMPTY_UPLOAD, desc: LOCALE.FILES_EMPTY_UPLOAD_DESC },
    { key: "gdrive", service: "launch-gdrive-migration",
      title: LOCALE.MIGRATE_GDRIVE_TITLE, desc: LOCALE.FILES_EMPTY_GDRIVE_DESC },
    // The one "+ New" create action no other card covers.
    { key: "scratch", service: "add-folder",
      title: LOCALE.FILES_EMPTY_START_SCRATCH },
  ];
}

/**
 * One action card. The card owns the service; every node inside it is
 * `active: 0` so a tap on the icon or the text reaches the card instead of
 * stopping at an interactive child (ui-core triggerHandlers).
 */
function card(ui, c) {
  const p = `${ui.fig.group}__files-empty`;
  const text = [
    Skeletons.Note({ active: 0, className: `${p}-card-title`, content: c.title }),
  ];
  if (c.desc) {
    text.push(Skeletons.Note({ active: 0, className: `${p}-card-desc`, content: c.desc }));
  }
  const opt = {
    className: `${p}-card`,
    dataset: { card: c.key },
    service: c.service,
    uiHandler: [ui],
    kids: [
      Skeletons.Box.X({
        active: 0,
        className: `${p}-ico`,
        kids: [
          Skeletons.Element({
            active: 0,
            tagName: "img",
            className: `${p}-img`,
            attribute: { src: ICONS[c.key], alt: "" },
          }),
        ],
      }),
      Skeletons.Box.Y({ active: 0, className: `${p}-text`, kids: text }),
    ],
  };
  // newDocument() reads the filename off the clicked widget: cmd.mget(_a.name).
  if (c.name) opt.name = c.name;
  return Skeletons.Box.Y(opt);
}

/**
 * @param {*} ui the folder window
 * @returns Skeleton
 */
function filesEmptyState(ui) {
  const p = `${ui.fig.group}__files-empty`;
  return Skeletons.Box.Y({
    className: `${p} no-content`,
    kids: [
      Skeletons.Box.Y({
        className: `${p}-hero`,
        kids: [
          Skeletons.Box.Y({
            className: `${p}-heading`,
            kids: [
              Skeletons.Note({ className: `${p}-title`, content: LOCALE.FILES_EMPTY_TITLE }),
              Skeletons.Note({ className: `${p}-desc`, content: LOCALE.FILES_EMPTY_DESC }),
            ],
          }),
          Skeletons.Box.X({
            className: `${p}-actions`,
            kids: filesEmptyCards().map((c) => card(ui, c)),
          }),
        ],
      }),
      Skeletons.Note({ className: `${p}-filtered`, content: LOCALE.NO_FOLDERS_OR_FILES_YET }),
    ],
  });
}

/**
 * The folder list's `emptyView`: build evArgs by its kind.
 *
 * ui-core pins Box.prototype.emptyView = LetcBlank (widgets/box/index.js),
 * shadowing its own kind-resolving CollectionView.prototype.emptyView, and
 * LetcBlank renders only `content` / `renderer` — never `kids`. Every other
 * evArgs in the app is a Note (content), so it never showed; the hero is a
 * Box and mounted as an empty div. Passed as the List.Smart's `emptyView`
 * option (Marionette merges it onto the instance) and called by Marionette's
 * _getView with `this` = the list. Unknown kind → the prototype's LetcBlank.
 */
function kindEmptyView() {
  const opt = (this.emptyViewOptions && this.emptyViewOptions()) || {};
  const View = opt.kind && Kind.get(opt.kind);
  return View || Object.getPrototypeOf(this).emptyView;
}

module.exports = { filesEmptyCards, filesEmptyState, kindEmptyView };
