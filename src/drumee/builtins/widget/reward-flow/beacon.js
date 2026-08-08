/**
 * A service POST that survives the page going away.
 *
 * The reward flow's unload guard has to report `dropped` from inside a
 * `pagehide` handler, and a normal postService() cannot do it: the browser
 * cancels in-flight fetches as soon as the document starts unloading, so the
 * request is created and then thrown away. The funnel would record nothing and
 * the user would stay `started` forever.
 *
 * WHY NOT navigator.sendBeacon
 *
 * The obvious tool, and the wrong one here. Session auth in this app rides on
 * REQUEST HEADERS -- `x-param-keysel` plus `x-param-<keysel>`, built by
 * makeHeaders in @drumee/ui-essentials -- and sendBeacon cannot set headers at
 * all. Its only lever is the Blob's Content-Type. A beacon would therefore
 * arrive unauthenticated, `this.uid` would be empty, and the row it was meant
 * to advance belongs to nobody.
 *
 * fetch(..., { keepalive: true }) is the same guarantee WITH headers: the spec
 * requires the request to outlive the document. Its 64 KB body cap is no
 * constraint on a payload of four short strings.
 *
 * FAILING IS SAFE, and that is deliberate. If the request never lands -- an
 * old browser that ignores `keepalive`, no network, a UA that kills it anyway
 * -- the row simply stays where it was, which is exactly the behaviour before
 * the unload guard existed. Nothing here is load-bearing enough to be worth a
 * throw inside a pagehide handler, where an exception can block the unload.
 */
const { makeHeaders } = require("@drumee/ui-essentials");

/**
 * Post to a service without waiting for it, in a way the unload cannot cancel.
 *
 * @param {String} service the SERVICE.* path, e.g. SERVICE.reward.track
 * @param {Object} [payload] request body; socket_id / device_id are added here
 *   the way ui-essentials' own defaultPayload() adds them, so a beacon and a
 *   normal postService carry the same envelope
 * @returns {Boolean} whether a request was actually dispatched. Only ever used
 *   for tests and logging -- there is no answer to wait for, and by the time
 *   one could arrive the document is gone.
 */
function beaconPost(service, payload = {}) {
  // Every one of these is absent in some legitimate context: `fetch` under an
  // old UA, `bootstrap` before the app has booted, `Visitor` on a page that
  // never signed in. A guard rather than an optional chain because `bootstrap`
  // is a bare global -- `bootstrap?.()` still throws ReferenceError when it was
  // never declared, the same trap libs/campaign documents.
  if (typeof fetch !== "function") return false;
  if (typeof bootstrap !== "function") return false;
  if (!service) return false;

  try {
    const { svc } = bootstrap() || {};
    if (!svc) return false;

    const body = { ...payload };
    if (typeof Visitor === "object" && Visitor) {
      // Read defensively: this runs while the page is being torn down, and a
      // Visitor mid-teardown is not worth failing the report over.
      try {
        body.socket_id = Visitor.get(_a.socket_id);
        body.device_id = Visitor.deviceId();
      } catch (e) { /* envelope only -- the service reads uid from the session */ }
    }

    fetch(`${svc}${service}`, {
      method: "POST",
      // The entire reason this module exists.
      keepalive: true,
      mode: "cors",
      cache: "no-cache",
      // The real auth headers, not a reimplementation of them. If the session
      // header scheme ever changes, this changes with it.
      headers: makeHeaders(),
      body: JSON.stringify(body),
    }).catch(() => { /* see the module docblock: failing is the old behaviour */ });

    return true;
  } catch (e) {
    // Never propagate. A throw inside a pagehide handler can stall the very
    // navigation the user just confirmed.
    return false;
  }
}

module.exports = { beaconPost };
