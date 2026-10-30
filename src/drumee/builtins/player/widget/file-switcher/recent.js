/**
 * Files the user opened in a player, newest first.
 *
 * There is no server record of what a user viewed, so the list lives in this
 * browser, per user. Only what is needed to draw a row and reopen the file is
 * kept; the file's attributes are fetched again on open, so a stale row (file
 * renamed, moved or deleted since) cannot open the wrong thing.
 *
 * The panel shows the ones of the folder it lists (index renderLists), so
 * `pid` is kept and the list is long enough to hold a few per folder.
 */

const { dataTypeOf } = require("libs/file-meta");

const MAX = 30;

function key() {
  return `player-file-switcher:recent:${Visitor.id}`;
}

function read() {
  try {
    const list = JSON.parse(localStorage.getItem(key()) || "[]");
    return Array.isArray(list) ? list.filter((r) => r && r.nid && r.hub_id) : [];
  } catch (e) {
    return [];
  }
}

function write(list) {
  try {
    localStorage.setItem(key(), JSON.stringify(list.slice(0, MAX)));
  } catch (e) {
    // Private mode / quota: the panel just shows fewer recents.
  }
}

/**
 * Put `node` at the head of the list. The Casual marker travels with it:
 * the early Casual sheets are `.json` files told apart only by their
 * dataType, and a row without it drew the "{..}" JSON badge.
 */
function remember(node = {}) {
  const { nid, hub_id, pid, filename, ext, filetype, area } = node;
  if (!nid || !hub_id) return;
  const rest = read().filter((r) => r.nid !== nid);
  const entry = { nid, hub_id, pid, filename, ext, filetype, area };
  // The row's thumbnail (chat/node-icon) needs these when the folder listing
  // can't supply them — a task attachment's /__chat__/__task__ folder is
  // never listed.
  for (const k of ["capability", "mtime", "ctime", "md5Hash"]) {
    if (node[k] != null) entry[k] = node[k];
  }
  const dataType = dataTypeOf(node);
  if (dataType) entry.dataType = dataType;
  write([entry, ...rest]);
}

/** Drop a file that could not be opened any more. */
function forget(nid) {
  write(read().filter((r) => r.nid !== nid));
}

module.exports = { read, remember, forget };
