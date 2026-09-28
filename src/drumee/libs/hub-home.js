/**
 * `media.home` for a hub — shared, de-duplicated, remembered for the session.
 *
 * WHY. The workspace chat cannot ask for its messages until it knows the hub's
 * `chat_upload_id`, which only `media.home` answers. The chat widget used to
 * fetch it itself, AFTER the workspace pane had mounted, which in turn waited
 * on `media.attributes`: three round trips in series before a single message
 * could paint, on every workspace switch.
 *
 * Now `Wm.loadWorkspace` starts this request at the same moment as
 * `media.attributes`, and the chat widget picks up the SAME promise (in flight)
 * or the remembered answer (a workspace switched back to). A remembered answer
 * is revalidated in the background, so nothing stays stale longer than one
 * round trip — the libs/read-cache contract.
 *
 * Only a non-empty answer is remembered: media.home can legitimately come back
 * empty (a secure-share recipient with no chat home), and that must not stick.
 */
const readCache = require("./read-cache");

const inflight = new Map();
const keyOf = (hub_id) => `media.home:${hub_id}`;

function _fetch(view, hub_id) {
  if (inflight.has(hub_id)) return inflight.get(hub_id);
  const p = Promise.resolve()
    .then(() => view.fetchService({ service: SERVICE.media.home, hub_id }))
    .then((data) => {
      if (data && typeof data === "object" && data.chat_upload_id) {
        readCache.set(keyOf(hub_id), { ...data });
      }
      return data;
    })
    .finally(() => inflight.delete(hub_id));
  inflight.set(hub_id, p);
  return p;
}

/**
 * Start (or join) the request without waiting on it. Errors are swallowed —
 * the widget that actually needs the answer asks again through get().
 */
function warm(view, hub_id) {
  if (!hub_id || !view || typeof view.fetchService !== "function") return;
  if (readCache.peek(keyOf(hub_id))) return;
  _fetch(view, hub_id).catch(() => { });
}

/**
 * @returns {Promise<Object>} the remembered answer at once (revalidated in the
 *   background), else the in-flight request, else a new one.
 */
function get(view, hub_id) {
  const cached = readCache.peek(keyOf(hub_id));
  if (cached) {
    _fetch(view, hub_id).catch(() => { });
    return Promise.resolve({ ...cached });
  }
  return _fetch(view, hub_id);
}

module.exports = { get, warm };
