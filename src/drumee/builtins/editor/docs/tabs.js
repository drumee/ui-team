/**
 * Document tabs for a `.udoc` — the Google-Docs "Document tabs" model: one
 * FILE holds several documents, one of which is shown at a time.
 *
 * ON DISK the file stays the JSON wrapper it always was, with two fields
 * added, so a build without this feature still opens the file and shows the
 * active tab:
 *
 *   {
 *     "docx":   "<base64 of the ACTIVE tab>",   // what old readers show
 *     "tabs":   [ { "id": "t1", "name": "Tab 1", "docx": "<base64>" }, … ],
 *     "active": "t1"
 *   }
 *
 * IN CO-EDITING each tab is its own room, because a Yjs room holds exactly one
 * document: tab 1 keeps the bare node id (so rooms opened before tabs existed
 * keep working) and the others use `<nid>~<tabId>` — see `roomId`/`splitRoom`.
 */

/** Unique enough for a per-file list; also the room suffix. */
function newTabId() {
  return `t${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
}

/**
 * The tabs of a parsed `.udoc` payload, always at least one.
 *
 * @param {Object} json the parsed file, or null for a new document
 * @param {String} [blank] base64 of the blank document to seed tab 1 with
 * @returns {{tabs: Array, active: String}}
 */
function readTabs(json, blank) {
  const j = json || {};
  const list = Array.isArray(j.tabs) ? j.tabs.filter((t) => t && t.id) : [];
  if (list.length) {
    const active = list.some((t) => t.id === j.active) ? j.active : list[0].id;
    return { tabs: list.map((t) => ({ ...t })), active };
  }
  // A file written before tabs existed: its single document becomes tab 1.
  const id = newTabId();
  return {
    tabs: [{ id, name: defaultName(0), docx: j.docx || blank || null }],
    active: id,
  };
}

/**
 * The payload to store. `docx` mirrors the active tab so a reader that knows
 * nothing about tabs still opens the document the author was last in.
 *
 * @param {Array} tabs
 * @param {String} active
 */
function writeTabs(tabs, active) {
  const list = tabs.map((t) => ({ id: t.id, name: t.name, docx: t.docx || null }));
  const cur = list.find((t) => t.id === active) || list[0];
  return { docx: cur ? cur.docx : null, tabs: list, active: cur ? cur.id : null };
}

/** "Tab 1", "Tab 2", … — the name Google gives a new tab. */
function defaultName(index) {
  return `${LOCALE.TAB || "Tab"} ${index + 1}`;
}

/**
 * Room for a tab. The FIRST tab keeps the plain node id: files created before
 * tabs existed already have a room under that name, and their history lives
 * there.
 */
function roomId(nid, tabs, tabId) {
  if (!tabs.length || tabs[0].id === tabId) return nid;
  return `${nid}~${tabId}`;
}

/** The `{ nid, tabId }` a room name stands for. */
function splitRoom(room) {
  const i = String(room || "").indexOf("~");
  if (i < 0) return { nid: room, tabId: null };
  return { nid: room.slice(0, i), tabId: room.slice(i + 1) };
}

module.exports = { newTabId, readTabs, writeTabs, defaultName, roomId, splitRoom };
