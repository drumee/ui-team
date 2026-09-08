/**
 * The five things a user can create, in one place.
 *
 * Three surfaces offer this exact list and they must not drift: the topbar
 * "+ New" dropdown's "Add new" group, the tablet "more" menu that splices the
 * same rows inline, and the mobile drawer's `create` mode. Each renders them
 * with its OWN row builder — a menu row, a plain menu item, a sidebar item —
 * so what is shared here is the data, not the markup.
 *
 * `mayWrite` is the current-workspace write privilege, resolved once per render
 * by the caller (Desk._curWorkspaceCanWrite) and threaded in. Everything except
 * WORKSPACE writes into the workspace the user is currently in, so it follows
 * their privilege there: view and chat members cannot create files. Creating a
 * new workspace belongs to their own account, not to the workspace they happen
 * to be visiting, so it always stays.
 *
 * `iconClass` and `highlight` are consumed only by the surfaces that style
 * rows by type; a builder that has no use for them ignores them.
 */
const createEntries = (mayWrite) => [
  {
    ico: "addmenu-folder",
    label: LOCALE.WORKSPACE || "Workspace",
    service: "new-workspace",
    name: "",
    iconClass: "ico-workspace",
    highlight: 1,
  },
  ...(!mayWrite
    ? []
    : [
        {
          ico: "addmenu-note",
          label: LOCALE.NOTE || "Note",
          service: "new-note",
          name: "",
          iconClass: "ico-note",
          highlight: 0,
        },
        {
          ico: "addmenu-document",
          label: LOCALE.DOCUMENT || "Document",
          service: "new-document",
          name: "document.docx",
          iconClass: "ico-document",
          highlight: 0,
        },
        {
          ico: "addmenu-spreadsheet",
          label: LOCALE.SPREADSHEET || "Spreadsheet",
          service: "new-spreadsheet",
          name: "spreadsheet.xlsx",
          iconClass: "ico-spreadsheet",
          highlight: 0,
        },
        {
          ico: "addmenu-presentation",
          label: LOCALE.PRESENTATION || "Presentation",
          service: "new-presentation",
          name: "presentation.pptx",
          iconClass: "ico-presentation",
          highlight: 0,
        },
      ]),
];

module.exports = { createEntries };
