// ==================================================================== *
//   FILE : builtins/editor/docs/live-comments
//   TYPE : Helpers — keep co-editing (Live) comments in the saved .docx
// ==================================================================== *

/**
 * In a Live room the comment THREADS do not live in the document: the
 * highlight marks ride the ProseMirror content, but each thread (author,
 * date, text, replies) is an entry of the room's Yjs map
 * `ydoc.getMap("comments")` — key String(id), value Casual's Comment JSON
 * { id, author, date, content: Paragraph[], parentId?, done? }.
 *
 * Casual's own export never writes them: a Live editor wraps a blank document
 * with no originalBuffer, and that path repacks the .docx without any
 * comments part. Measured on drumee.in 2026-10-21: 79 saved versions of a
 * commented doc, comment anchors in word/document.xml, no word/comments.xml
 * in any. So the threads existed only in the gateway, which keeps no durable
 * copy, and the server could only tell "somebody commented".
 *
 * This module closes that gap from the integration side:
 *   withComments   adds word/comments.xml (+ commentsExtended / Ids /
 *                  Extensible, rels, content types) to the bytes about to be
 *                  saved, through Casual's public attemptSelectiveSave, which
 *                  leaves word/document.xml untouched;
 *   seedComments   puts the threads of a saved file back into an EMPTY room
 *                  map (a room the gateway re-created from the file), so a
 *                  gateway restart no longer drops them;
 *   peerCommentIdBase  a per-peer id range, so two peers commenting at the
 *                  same time cannot pick the same id and overwrite each
 *                  other's thread (Casual issue #257: every peer of a Live room
 *                  otherwise starts counting at 1).
 *
 * Casual's functions are passed in rather than imported, so this file loads
 * in tests without the editor bundle. Everything fails safe: any doubt leaves
 * the bytes / the room exactly as they were.
 */

// OOXML comment ids are 32-bit decimals: keep base + the ids one peer can
// create in a session below 2^31.
const ID_RANGE = 1e6;
const MAX_RANGES = 2000;

/** The room's threads, real ids only (-1 is the placeholder of a comment the
 *  user has not submitted yet), oldest id first. */
function liveComments(map) {
  const out = [];
  if (!map || typeof map.forEach !== "function") return out;
  map.forEach((v) => {
    if (v && typeof v === "object" && Number(v.id) > 0) out.push(v);
  });
  return out.sort((a, b) => Number(a.id) - Number(b.id));
}

/**
 * The bytes to save, with the room's threads written in as word/comments.xml.
 * @param {ArrayBuffer} bytes the .docx Casual exported
 * @param {Y.Map|null} map the room's comments map
 * @param {Function} attemptSelectiveSave from @casualoffice/docs/core
 * @returns {Promise<ArrayBuffer>} the original bytes when there is nothing to
 *   add or anything fails
 */
async function withComments(bytes, map, attemptSelectiveSave) {
  try {
    const comments = liveComments(map);
    if (!comments.length || typeof attemptSelectiveSave !== "function" || !bytes) return bytes;
    const out = await attemptSelectiveSave(
      { package: { document: { content: [], comments } } },
      bytes,
      // No paragraph is rewritten: document.xml stays exactly as exported.
      { changedParaIds: new Set(), structuralChange: false, hasUntrackedChanges: false },
    );
    return out && out.byteLength ? out : bytes;
  } catch (e) {
    console.warn("[DOCS] comments not written into the save", e);
    return bytes;
  }
}

/**
 * Fill an EMPTY room map with the threads stored in the file it was opened
 * from. A room that already holds threads is the live truth and is never
 * touched; so is anything when the file has none.
 * @param {Y.Map} map the room's comments map
 * @param {ArrayBuffer} bytes the .docx the room was opened with
 * @param {Function} parseDocx from @casualoffice/docs/core
 * @returns {Promise<number>} how many threads were put back
 */
async function seedComments(map, bytes, parseDocx) {
  try {
    if (!map || map.size > 0 || !bytes || typeof parseDocx !== "function") return 0;
    const parsed = await parseDocx(bytes);
    const doc = (parsed && parsed.package && parsed.package.document) || (parsed && parsed.document) || {};
    const comments = (Array.isArray(doc.comments) ? doc.comments : []).filter((c) => c && Number(c.id) > 0);
    // Checked again after the await: a peer may have filled it meanwhile.
    if (!comments.length || map.size > 0) return 0;
    const write = () => {
      for (const c of comments) map.set(String(c.id), JSON.parse(JSON.stringify(c)));
    };
    if (map.doc && typeof map.doc.transact === "function") map.doc.transact(write);
    else write();
    return comments.length;
  } catch (e) {
    console.warn("[DOCS] comments not restored into the room", e);
    return 0;
  }
}

/** Where this peer's comment ids start: a random 1e6-wide range. */
function peerCommentIdBase(random = Math.random) {
  return (1 + Math.floor(random() * MAX_RANGES)) * ID_RANGE;
}

module.exports = { liveComments, withComments, seedComments, peerCommentIdBase };
