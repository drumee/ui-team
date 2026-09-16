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
 */

/** Extension carried by every file this editor writes. */
const EXT = "dnote";

/** Stamped into the node's metadata; a second, rename-proof signal. */
const DATA_TYPE = "drumee.blocknote";

const VERSION = 1;

/**
 * @param {Array} blocks BlockNote document (`editor.document`)
 * @returns {String} the bytes to hand to media.save
 */
function serialize(blocks) {
  return JSON.stringify({
    app: DATA_TYPE,
    version: VERSION,
    blocks: Array.isArray(blocks) ? blocks : [],
  });
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
 * @returns {{blocks: Array}|{error: String}}
 */
function parse(content) {
  if (typeof content !== "string" || !content.trim()) {
    // A brand-new note legitimately has no bytes yet.
    return { blocks: [] };
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
  return { blocks: data.blocks };
}

module.exports = { EXT, DATA_TYPE, VERSION, serialize, parse };
