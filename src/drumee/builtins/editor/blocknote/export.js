// ===========================================================
//  Note export — turns the note's blocks into a file.
//
//  Loaded on demand (import() from editor/blocknote), never at boot and never
//  when a note is merely opened: nobody pays for export until they ask for it.
//
//  Everything here is built on what Drumee already ships, so there is no new
//  dependency and no new licence:
//  - HTML / Markdown come from BlockNote itself (@blocknote/core, MPL-2.0).
//  - The HTML page is the SAME template and stylesheet the markdown Note has
//    always exported with, so both notes produce the same-looking files.
//  - PDF / Word are NOT made here: the HTML goes to media.save with
//    `convert_to`, which runs it through LibreOffice on the server — the path
//    the markdown Note's "Export as PDF / Word" already uses.
//  BlockNote's own PDF/Word exporters (@blocknote/xl-*) are deliberately not
//  used: they are GPL-3.0 or paid.
// ===========================================================

const FORMATS = {
  html: { ext: "html", mime: "text/html", filetype: _a.web },
  md: { ext: "md", mime: "text/markdown", filetype: "markdown" },
  csv: { ext: "csv", mime: "text/csv", filetype: _a.text },
  pdf: { ext: "pdf", filetype: _a.document, server: 1 },
  docx: { ext: "docx", filetype: _a.document, server: 1 },
};

/**
 * @param {String} str
 * @returns {String}
 */
function escapeHtml(str) {
  return `${str}`
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * The whole note as a standalone HTML page.
 *
 * `blocksToHTMLLossy` rather than `blocksToFullHTML`: the full form keeps
 * BlockNote's internal DOM and class names, which only render with BlockNote's
 * own stylesheet. The lossy form is plain semantic HTML (h1, p, ul, table …),
 * which is what a file opened outside Drumee — or LibreOffice — can read.
 *
 * @param {BlockNoteEditor} editor
 * @param {String} title
 * @returns {String}
 */
function toHTML(editor, title) {
  const body = editor.blocksToHTMLLossy(editor.document);
  const template = require("../markdow/template/index.html.text").default;
  return _.template(template)({
    title: escapeHtml(title),
    description: "",
    keywords: "",
    style: printStyle(),
    body,
  });
}

/**
 * The body only, for printing: print-js wraps it in its own page.
 * @param {BlockNoteEditor} editor
 * @returns {String}
 */
function toPrintHTML(editor) {
  return editor.blocksToHTMLLossy(editor.document);
}

/**
 * The stylesheet a printed note is laid out with — the exported page's own.
 * @returns {String}
 */
function printStyle() {
  return require("../markdow/template/style.css.txt").default;
}

/**
 * Lossy by BlockNote's own name: nested children are flattened and a few
 * block styles have no Markdown equivalent. Same trade-off Notion makes.
 * @param {BlockNoteEditor} editor
 * @returns {String}
 */
function toMarkdown(editor) {
  return editor.blocksToMarkdownLossy(editor.document);
}

/**
 * Plain text of BlockNote inline content (styled text, links).
 * @param {Array} content
 * @returns {String}
 */
function inlineText(content) {
  if (!Array.isArray(content)) return "";
  return content
    .map((c) => {
      if (!c) return "";
      if (c.type === "text") return c.text || "";
      if (c.type === "link") return inlineText(c.content);
      return inlineText(c.content);
    })
    .join("");
}

/**
 * RFC 4180 field: quoted when it holds a comma, a quote or a line break.
 * @param {String} value
 * @returns {String}
 */
function csvField(value) {
  const v = `${value}`;
  return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/**
 * Every table in the note, in document order, nested ones included.
 * @param {Array} blocks
 * @param {Array} [out]
 * @returns {Array}
 */
function findTables(blocks, out = []) {
  for (const b of blocks || []) {
    if (b.type === "table" && b.content && b.content.rows) out.push(b);
    if (b.children && b.children.length) findTables(b.children, out);
  }
  return out;
}

/**
 * One CSV per table. CSV is a single grid, so a note is only CSV-shaped
 * through its tables — which is also all Notion exports as CSV.
 *
 * A cell is either inline content directly (older schema) or a `tableCell`
 * wrapping it (current schema); both are read.
 *
 * @param {BlockNoteEditor} editor
 * @returns {Array<String>} empty when the note has no table
 */
function toCSV(editor) {
  return findTables(editor.document).map((table) =>
    table.content.rows
      .map((row) =>
        (row.cells || [])
          .map((cell) => {
            const content = cell && cell.type === "tableCell" ? cell.content : cell;
            return csvField(inlineText(content));
          })
          .join(",")
      )
      .join("\r\n")
  );
}

/**
 * The note in the given format.
 *
 * This is a SEPARATE file. The note itself is never written as markdown —
 * see "markdown is NEVER written back" in tests/note-blocknote.test.js — and
 * an export never touches the note's node (exportNote saves it as a new file).
 *
 * @param {String} format  html | print | md | csv
 * @param {BlockNoteEditor} editor
 * @param {String} title
 */
function render(format, editor, title) {
  switch (format) {
    case "print":
      return toPrintHTML(editor);
    case "md":
      return toMarkdown(editor);
    case "csv":
      return toCSV(editor);
    default:
      return toHTML(editor, title);
  }
}

module.exports = {
  render,
  FORMATS,
  toHTML,
  toPrintHTML,
  printStyle,
  toMarkdown,
  toCSV,
  // exported for tests
  csvField,
  inlineText,
};
