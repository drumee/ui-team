/**
 * Rows of the "+ New" menu.
 *
 * The topbar's dropdown (toolkit/index.js newMenu) shows the two IMPORT rows
 * and nests these four CREATE rows in a flyout off "+ Add new".
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
 * The create rows — Folder / Document / Spreadsheet / Presentation.
 *
 * Services and filenames are the historical ones the window already handles;
 * only the presentation differs between the two surfaces.
 *
 * @param {Object} ui
 * @param {Object} [opt]
 * @param {Boolean} [opt.submenu] add the flyout-item class. The topbar nests
 *   these under "+ Add new" and indents them to read as nested; the hero's
 *   menu is not nested, so it asks for them plain.
 * @returns {Array}
 */
export function createRows(ui, opt = {}) {
  const cnDropdown = `${ui.fig.group}-button__dropdown-menu`;
  const cnItem = `${cnDropdown}__item`;
  const nested = opt.submenu ? ` ${cnDropdown}__submenu-item` : "";
  return [
    menuRow(ui, {
      service: "add-folder",
      ico: "addmenu-folder",
      content: LOCALE.FOLDER,
      area: ui.mget(_a.area) || _a.personal,
      className: `${cnItem}--add-folder${nested}`,
    }),
    // Note is temporarily hidden from the create list (2026-08). The add-note
    // handler (window/core.js) and editor_markdown stay wired — uncomment this
    // row to restore the option on BOTH surfaces.
    // menuRow(ui, {
    //   service: "add-note",
    //   ico: "addmenu-note",
    //   content: LOCALE.NOTE,
    //   className: `${cnItem}--add-note${nested}`,
    // }),
    menuRow(ui, {
      service: "new-document",
      name: "document.docx",
      ico: "addmenu-document",
      content: LOCALE.DOCUMENT,
      className: `${cnItem}--document${nested}`,
    }),
    menuRow(ui, {
      service: "new-document",
      name: "spreadsheet.xlsx",
      ico: "addmenu-spreadsheet",
      content: LOCALE.SPREADSHEET,
      className: `${cnItem}--spreadsheet${nested}`,
    }),
    menuRow(ui, {
      service: "new-document",
      name: "presentation.pptx",
      ico: "addmenu-presentation",
      content: LOCALE.PRESENTATION,
      className: `${cnItem}--presentation${nested}`,
    }),
  ];
}
