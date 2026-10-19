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

/** Put `node` at the head of the list. */
function remember(node = {}) {
  const { nid, hub_id, pid, filename, ext, filetype, area } = node;
  if (!nid || !hub_id) return;
  const rest = read().filter((r) => r.nid !== nid);
  write([{ nid, hub_id, pid, filename, ext, filetype, area }, ...rest]);
}

/** Drop a file that could not be opened any more. */
function forget(nid) {
  write(read().filter((r) => r.nid !== nid));
}

module.exports = { read, remember, forget };
