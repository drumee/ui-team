/**
 * Where a Casual document's bytes live.
 *
 * ui-core's `View.prototype.actualNode(format)` is the one place that knows
 * how to address a file: endpoint + `file/<format>/<nid>/<hub_id>`, plus the
 * share key (`?keysel=…`) a dmz visitor needs — without it the share host
 * answers 404 — and a `v=` cache buster derived from the node's md5/mtime.
 * Every editor load and export goes through here so none of them re-derive
 * that by hand (the hand-built URL is what left a shared sheet blank).
 *
 * @param {Object} [media]        the media VIEW the window was launched with
 * @param {Object} [fallback]     `{ nid, hub_id }` when there is no view yet
 * @returns {String|null}
 */
function contentUrl(media, fallback = {}) {
  try {
    const node = media && typeof media.actualNode === "function" ? media.actualNode(_a.orig) : null;
    if (node && node.url) return node.url;
  } catch (e) {
    /** a media without a node yet */
  }
  const get = (k) => (media && typeof media.mget === "function" ? media.mget(k) : null);
  const nid = fallback.nid || get(_a.nid);
  const hub_id = fallback.hub_id || get(_a.hub_id);
  if (!nid || !hub_id) return null;
  const b = (typeof bootstrap === "function" && bootstrap()) || {};
  const base = b.endpoint || `${location.href.split("#")[0].replace(/\/+$/, "")}/`;
  let url = `${base}file/orig/${nid}/${hub_id}`;
  if (b.keysel) url += `?keysel=${b.keysel}`;
  return url;
}

module.exports = { contentUrl };
