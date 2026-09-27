/**
 * Rows of the "+ New" menu.
 *
 * The topbar's dropdown (toolkit/index.js newMenu) lists these four CREATE
 * rows between its two IMPORT rows (From device ... Migrate from Google Drive).
 *
 * Kept in their own module rather than inlined so a second surface rendering
 * the create list cannot diverge from this one: Note was hidden from the list
 * in 2026-08, and a copied list would still be offering it.
 */

/**
 * One menu row: icon + label, carrying the `service` the window handles.
 *
 * `active: 0` on the kids so a click on the icon or the label bubbles to the
 * row — which owns the service — rather than being swallowed by the
 * interactive Button.Svg / Note.
 *
 * @param {Object} ui the window rendering the menu
 * @param {Object} spec
 * @param {String} spec.service
 * @param {String} spec.ico
 * @param {String} spec.content     the row's label
 * @param {String} [spec.area]      tints the monochrome folder glyph
 * @param {String} [spec.name]      filename carried by new-document rows
 * @param {String} [spec.className]
 */
export function menuRow(ui, { service, ico, content, area, name, className }) {
  const cnDropdown = `${ui.fig.group}-button__dropdown-menu`;
  const cnItem = `${cnDropdown}__item`;
  return Skeletons.Box.X({
    className: className ? `${cnItem} ${className}` : cnItem,
    uiHandler: [ui],
    service,
    // `name` rides along so new-document rows carry their filename
    // (document.docx / spreadsheet.xlsx / presentation.pptx) — newDocument()
    // reads cmd.mget(_a.name).
    name,
    kidsOpt: { active: 0 },
    kids: [
      Skeletons.Button.Svg({
        ico,
        active: 0,
        className: `${cnDropdown}__icon`,
        dataset: area ? { area } : undefined,
      }),
      Skeletons.Note({
        content,
        active: 0,
        className: `${cnDropdown}__name`,
      }),
    ],
  });
}

/**
 * The only platforms that offer the Casual editors as a create option: the
 * stage box, every dev endpoint it hosts, and a local build.
 *
 * The .udoc / .usheet editors are a proof of concept, so no deployment
 * carrying real user data invites people to start a document in a format that
 * can still change — neither production's root nor the preview endpoint beside
 * it. Opening an existing .udoc / .usheet keeps working everywhere; only the
 * two create rows disappear.
 */
const CASUAL_DEV_DOMAINS = ["drumee.in", "localhost"];

/**
 * Whether this deployment may offer the Casual editors in the create list.
 *
 * Matched on the PLATFORM domain the page server was configured with
 * ("drumee.in", "app.drumee.com"), not on anything closer to hand:
 *
 *  - the endpoint name cannot tell these apart — stage's root and
 *    production's root are BOTH called "main", and a dev endpoint carries a
 *    person's name, so there is no pattern to match;
 *  - the address bar cannot either — a workspace opens on its own subdomain
 *    (team-3238.app.drumee.com), so the host varies inside one deployment.
 *
 * `bootstrap()` here is the env the page server renders into the bootstrap
 * page, not the api.js fallback of the same name: a global `const` shadows the
 * `window` property, so every bundled module reading a bare `bootstrap` gets
 * the server's values. A deployment that cannot be identified hides the rows —
 * the dev boxes this POC is built for are the known ones.
 *
 * @returns {Boolean}
 */
function offersCasualEditors() {
  try {
    const env = (typeof bootstrap === "function" && bootstrap()) || {};
    const domain = String(env.main_domain || "").toLowerCase();
    return CASUAL_DEV_DOMAINS.some((d) => domain === d || domain.endsWith(`.${d}`));
  } catch (e) {
    return false;
  }
}

/**
 * The create rows — Folder / Document / Spreadsheet / Presentation.
 *
 * Services and filenames are the historical ones the window already handles;
 * only the presentation differs between the two surfaces.
 *
 * @param {Object} ui
 * @returns {Array}
 */
export function createRows(ui) {
  const cnItem = `${ui.fig.group}-button__dropdown-menu__item`;
  const casual = offersCasualEditors();
  return [
    menuRow(ui, {
      service: "add-folder",
      ico: "addmenu-folder",
      content: LOCALE.FOLDER,
      area: ui.mget(_a.area) || _a.personal,
      className: `${cnItem}--add-folder`,
    }),
    // Note is temporarily hidden from the create list (2026-08). The add-note
    // handler (window/core.js) and editor_markdown stay wired — uncomment this
    // row to restore the option on BOTH surfaces.
    // menuRow(ui, {
    //   service: "add-note",
    //   ico: "addmenu-note",
    //   content: LOCALE.NOTE,
    //   className: `${cnItem}--add-note`,
    // }),
    menuRow(ui, {
      service: "new-document",
      name: "document.docx",
      ico: "addmenu-document",
      content: LOCALE.DOCUMENT,
      className: `${cnItem}--document`,
    }),
    // Casual Docs (native .docx editor, editor_docs) — sits next to the
    // ONLYOFFICE "Document" with the SAME label and glyph; only the icon
    // colour (Casual blue, see skin/mixins/drumee.scss) tells them apart.
    // Handled by window/core.js `add-doc` → Wm.launch(editor_docs).
    casual
      ? menuRow(ui, {
          service: "add-doc",
          ico: "addmenu-document",
          content: LOCALE.DOCUMENT,
          className: `${cnItem}--doc`,
        })
      : null,
    menuRow(ui, {
      service: "new-document",
      name: "spreadsheet.xlsx",
      ico: "addmenu-spreadsheet",
      content: LOCALE.SPREADSHEET,
      className: `${cnItem}--spreadsheet`,
    }),
    // Casual Sheets — same label and glyph as the ONLYOFFICE "Spreadsheet",
    // Casual teal icon colour.
    casual
      ? menuRow(ui, {
          service: "add-sheet",
          ico: "addmenu-spreadsheet",
          content: LOCALE.SPREADSHEET,
          className: `${cnItem}--sheet`,
        })
      : null,
    menuRow(ui, {
      service: "new-document",
      name: "presentation.pptx",
      ico: "addmenu-presentation",
      content: LOCALE.PRESENTATION,
      className: `${cnItem}--presentation`,
    }),
    // The Casual rows above are null where they are hidden; dropped here so
    // the menu never receives a hole in its kids list.
  ].filter(Boolean);
}
