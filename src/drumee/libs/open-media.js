const { casualKind } = require("libs/file-meta");
/**
 * Open a file's player from anywhere — not only from a window.
 *
 * Extracted from window/utils openFileLocation (its "open the player" branch),
 * which still uses launchPlayer below; the Inbox's Chat details, which is not
 * a window, uses openMedia.
 */

// Folder / workspace / contact "files": their windows source their own
// `media`, so no media node is built for them (see launchPlayer).
const CONTAINER_FILETYPES = [
  _a.hub, _a.folder, "personal", "private", "share", "public",
  // Not a file either — application maps it to window_contact.
  _a.contact,
];

function appConfig(filetype, data) {
  return require("window/configs/application")(filetype, data);
}

/**
 * A Casual doc / sheet (.udoc / .usheet, or an early `.json` sheet carrying
 * the dataType marker) is "text" / "app-data" by category, so the map names
 * the text viewer — which shows the stored JSON; its own editor is told
 * apart only through a media model (libs/file-meta casualKind).
 */
function isCasualFile(node) {
  return !!casualKind(node || {});
}

/**
 * A Note (.dnote) carries `filetype: note` — its icon and the Notes filter —
 * and the map gives `note` the legacy editor_note, which shows the stored
 * JSON. Only the extension tells them apart (window/configs/application).
 */
function isBlocknoteFile(node) {
  const { EXT } = require("libs/blocknote-format");
  return `${(node && node.ext) || ""}`.toLowerCase() === EXT;
}

/**
 * Launch the player `opt` describes for (nid, hub_id), fetching the node's
 * attributes when the caller has none. The player gets a media node to read
 * its CONTENT through (editor/note, editor/markdow and player/text load their
 * body from `this.media.actualNode().url` — without it the file opens blank);
 * containers keep sourcing their own.
 *
 * @returns what Wm.launch returns; undefined after a "file not found" alert
 */
async function launchPlayer({ opt, node, nid, hub_id, media }, { fetchService, warn } = {}) {
  if (!node) {
    node = await fetchService({ service: SERVICE.media.attributes, nid, hub_id }, { async: 1 });
    if (!node || !node.nid) {
      Wm.alert(LOCALE.FILE_NOT_FOUND);
      return undefined;
    }
  }
  if (!opt.media && !CONTAINER_FILETYPES.includes(node.filetype)) {
    try {
      const k = await Kind.waitFor(_a.media);
      opt.media = media || new k({ model: new Backbone.Model(node) });
    } catch (e) {
      // Never let this cost the open itself: without media the file still
      // opens, just as blank as it did before.
      if (warn) warn("[openMedia] could not build media", e);
    }
  }
  // Callers resolve `opt` from the category alone (openFileLocation: a desk
  // link carries filetype "text"), so a Casual doc / sheet arrives here aimed
  // at the text viewer, and a Note (a link carries filetype "note") at the
  // legacy note editor. Route it by extension, as its tile does.
  if (opt.media && (isCasualFile(node) || isBlocknoteFile(node))) {
    const routed = appConfig(node.filetype, { ...node, media: opt.media });
    if (routed && routed.kind) opt = { ...opt, kind: routed.kind };
  }
  return Wm.launch({ ...opt, ...node }, { explicit: 1 });
}

/**
 * Open { nid, hub_id, filetype?, filename?, area? } in its player.
 * @returns Wm.launch's result; null when the type has no player; undefined
 *          when the node is gone (alerted).
 */
async function openMedia(data = {}, { fetchService, warn } = {}) {
  const { nid, hub_id } = data;
  let { filetype } = data;
  let node;
  const fetchNode = async () => {
    node = await fetchService({ service: SERVICE.media.attributes, nid, hub_id }, { async: 1 });
    if (!node || !node.nid) {
      Wm.alert(LOCALE.FILE_NOT_FOUND);
      return false;
    }
    filetype = node.filetype;
    return true;
  };
  if (!filetype && !(await fetchNode())) return undefined;
  let opt = appConfig(filetype, { ...data, ...node });
  let media = null;
  if (!opt || !opt.kind || isCasualFile(node || data)) {
    // A type the map does not name: a Univer sheet saved as .json, a Casual
    // doc, a note, a script. application() tells those apart from the node's
    // mimetype, dataType and ext, which it reads through a media model (the
    // folder hands it the tile's); build one from the node and ask again.
    if (!node && !(await fetchNode())) return undefined;
    try {
      const k = await Kind.waitFor(_a.media);
      media = new k({ model: new Backbone.Model(node) });
    } catch (e) {
      if (warn) warn("[openMedia] could not build media", e);
      return null;
    }
    opt = appConfig(filetype, { ...data, ...node, media });
    if (!opt || !opt.kind) return null;
  }
  return launchPlayer({ opt, node, nid, hub_id, media }, { fetchService, warn });
}

module.exports = { openMedia, launchPlayer, CONTAINER_FILETYPES };
