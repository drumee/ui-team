/**
 * On-disk format for the Notion-style Note (BlockNote), kept in its own tiny
 * module so `window/configs/application` can learn the extension WITHOUT
 * pulling the editor — and BlockNote itself — into the main bundle. The editor
 * is a lazy chunk; this file must stay dependency-free.
 *
 * A note is a JSON envelope rather than a bare block array so that a future
 * format change is detectable instead of being guessed at:
 *
 *   { "app": "drumee.blocknote", "version": 1, "blocks": [ … ] }
 *
 * Two OPTIONAL page decorations ride in the same envelope (Lexis's Figma,
 * 2026-10-22) — they belong to the document, so they travel with it:
 *
 *   "icon":  "🚀"                          one emoji above the title
 *   "cover": { "nid": "…", "hub_id": "…" } an image node shown as the banner
 *
 * Both are additive: a note without them is byte-for-byte what it was, and a
 * reader that predates them ignores keys it does not know. No VERSION bump.
 */

/** Extension carried by every file this editor writes. */
const EXT = "dnote";

/**
 * The format this editor REPLACES.
 *
 * The old Note wrote plain markdown through the same media.save text path, and
 * left NOTHING on the node to say a Drumee Note had written it: it saves
 * `filetype: "markdown"`, which is exactly what an uploaded README.md also
 * carries. So "every old note" and "every markdown file" are the same set, and
 * routing one here routes the other too. That is deliberate and was decided
 * with Lexis — but it is the reason the import path below never writes
 * markdown back (see the note on conversion in editor/blocknote).
 */
const LEGACY_EXT = "md";
const LEGACY_FILETYPE = "markdown";
const LEGACY_MIMETYPE = "text/markdown";

/**
 * Does this node hold a note in the OLD format?
 *
 * Any one signal is enough: a node reaches the window resolver with whichever
 * of the three the caller happened to have.
 *
 * @param {Object} o
 * @param {String} o.ext
 * @param {String} o.filetype
 * @param {String} o.mimetype
 * @returns {Boolean}
 */
function isLegacyNote({ ext, filetype, mimetype } = {}) {
  return (
    `${ext || ""}`.toLowerCase() === LEGACY_EXT ||
    `${filetype || ""}`.toLowerCase() === LEGACY_FILETYPE ||
    `${mimetype || ""}`.toLowerCase() === LEGACY_MIMETYPE
  );
}

/** Stamped into the node's metadata; a second, rename-proof signal. */
const DATA_TYPE = "drumee.blocknote";

const VERSION = 1;

/**
 * @param {*} icon
 * @returns {String} the icon if it is one, else ""
 */
function cleanIcon(icon) {
  return typeof icon === "string" && icon.length && icon.length <= 16 ? icon : "";
}

/**
 * @param {*} cover
 * @returns {{nid: String, hub_id: String}|null} the cover if it names a node
 */
function cleanCover(cover) {
  if (!cover || typeof cover !== "object") return null;
  const { nid, hub_id } = cover;
  if (typeof nid !== "string" || !nid || typeof hub_id !== "string" || !hub_id) {
    return null;
  }
  return { nid, hub_id };
}

/**
 * @param {Array} blocks BlockNote document (`editor.document`)
 * @param {Object} [page] the page decorations: { icon, cover }
 * @returns {String} the bytes to hand to media.save
 */
function serialize(blocks, page = {}) {
  const data = {
    app: DATA_TYPE,
    version: VERSION,
    blocks: Array.isArray(blocks) ? blocks : [],
  };
  const icon = cleanIcon(page && page.icon);
  const cover = cleanCover(page && page.cover);
  if (icon) data.icon = icon;
  if (cover) data.cover = cover;
  return JSON.stringify(data);
}

/**
 * Read a stored note back.
 *
 * Deliberately strict: anything we cannot positively recognise is reported as
 * an ERROR rather than silently treated as an empty note. The editor refuses to
 * save when this fails, so a file we failed to understand is never overwritten
 * with a blank document.
 *
 * @param {String} content raw file bytes
 * @returns {{blocks: Array, icon: String, cover: Object|null}|{error: String}}
 */
function parse(content) {
  if (typeof content !== "string" || !content.trim()) {
    // A brand-new note legitimately has no bytes yet.
    return { blocks: [], icon: "", cover: null };
  }
  let data;
  try {
    data = JSON.parse(content);
  } catch (e) {
    return { error: "unparsable" };
  }
  if (!data || data.app !== DATA_TYPE || !Array.isArray(data.blocks)) {
    return { error: "unrecognised" };
  }
  return {
    blocks: data.blocks,
    // A malformed decoration is dropped, never fatal: the text is what matters.
    icon: cleanIcon(data.icon),
    cover: cleanCover(data.cover),
  };
}

module.exports = {
  EXT,
  DATA_TYPE,
  VERSION,
  LEGACY_EXT,
  LEGACY_FILETYPE,
  LEGACY_MIMETYPE,
  isLegacyNote,
  serialize,
  parse,
};
