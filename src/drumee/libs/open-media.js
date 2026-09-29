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
  if (!filetype) {
    node = await fetchService({ service: SERVICE.media.attributes, nid, hub_id }, { async: 1 });
    if (!node || !node.nid) {
      Wm.alert(LOCALE.FILE_NOT_FOUND);
      return undefined;
    }
    filetype = node.filetype;
  }
  const opt = appConfig(filetype, { ...data, ...node });
  if (!opt || !opt.kind) return null;
  return launchPlayer({ opt, node, nid, hub_id }, { fetchService, warn });
}

module.exports = { openMedia, launchPlayer, CONTAINER_FILETYPES };
