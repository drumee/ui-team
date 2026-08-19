/**
 * Compact form of the desk "open this node" deep link.
 *
 * The long form is what `DrumeeMFS.viewerLink()` (@drumee/ui-core letc/mfs.js)
 * has always produced, and it is what every existing link in an inbox, a chat
 * message or a notification carries:
 *
 *   https://<domain>/-/#/desk/wm/open/nid=<nid>&hub_id=<hub_id>&kind=<kind>&filetype=<filetype>
 *
 * The compact form drops the key names and the `kind` value:
 *
 *   https://<domain>/-/#/desk/wm/o/<nid>/<hub_id>/<filetype>
 *
 * 103 characters down to 62 on a typical link. Requested by Lexis for the
 * "Designation link" action, which is the only place that hands this URL to a
 * human to paste somewhere.
 *
 * ── Why `kind` can be dropped without losing anything ──────────────────────
 *
 * `kind` is not independent data: viewerLink() derives it from `filetype` alone,
 * via `window/configs/application`. So the reader can recompute it instead of
 * carrying it. `toCompactUrl` proves that per link rather than assuming it — it
 * recomputes the kind and, on any mismatch, returns the long URL untouched. The
 * one case that legitimately mismatches is `filetype=hub`, where viewerLink()
 * looks up `hub_<area>` and `area` is not on the URL; those links simply stay
 * long. Nothing is ever silently dropped.
 *
 * That guard is the reason this is safe rather than merely shorter: every input
 * this module does not fully understand falls back to today's exact behaviour.
 *
 * ── Why `filetype` must stay ───────────────────────────────────────────────
 *
 * It is load-bearing, and its absence fails silently rather than loudly.
 * `openFileLocation` (builtins/window/utils.js) fetches the node attributes when
 * `filetype` is missing, which assigns its local `node`; the player branch below
 * is guarded by `if (opt.kind && !node && …)`, so with `node` now set the file
 * opens as "reveal the parent folder" — and with no `pid` on the link that is the
 * workspace root. A link that quietly opens the wrong thing is worse than a long
 * one, so `filetype` is carried in full.
 *
 * ── Arrival paths: one works, one is a known pre-existing gap ──────────────
 *
 * `modules/desk/wm/index.js` route() has two call sites:
 *
 *   warm  ✅ the app is already running → path[2] === COMPACT_SEGMENT. This is the
 *            live path and the one the Designation link actually uses.
 *   cold  ⚠️ arrived signed out. UNREACHABLE today — `locationOnStart` is
 *            overwritten on every boot and sign-in reloads the document, so the
 *            original link is gone before route() reads it. Measured 2026-08-18;
 *            the LONG form is lost identically, so this is not a compact-form
 *            defect. Full reasoning at that call site.
 *
 * `parseCompactPath` still returns `kind` for the cold site: `openSharedLink`
 * branches on `opt.kind` for every filetype that is not media and not a
 * folder/hub (note, markdown, text, script, vector, schedule), so the payload is
 * identical to the long form's — ready for when the capture is fixed.
 */

/** Path segment of the long form — unchanged, still the only form we emit for
 *  anything this module cannot round-trip. */
const LONG_SEGMENT = 'open';

/** Path segment of the compact form. Additive: `route()` keeps its `open` case
 *  exactly as it was, so links already in circulation are unaffected. */
const COMPACT_SEGMENT = 'o';

/**
 * Values allowed in a compact path segment.
 *
 * `parseModule` / `parseModuleArgs` (ui-core letc/user.js) split a hash on
 * [#/&?], so a value containing any of those would be torn into pieces and
 * silently mis-read. Percent-encoding is deliberately NOT accepted: rather than
 * encode and decode — two more places to get it wrong — anything outside this
 * class keeps the long form. Every real `filetype` in window/configs/application
 * passes (`drumee.note` included), as does a numeric nid and a hex hub_id.
 */
const SAFE_SEGMENT = /^[A-Za-z0-9._-]+$/;

/**
 * The `kind` viewerLink() would have written for this filetype.
 *
 * Called exactly the way viewerLink() calls it — `(filetype, "")` — so the
 * result is the same by construction. The empty-string second argument carries
 * no `media`, which is what keeps `application()` on its plain lookup branch.
 *
 * @param {String} filetype
 * @returns {String|undefined}
 */
function kindForFiletype(filetype) {
  try {
    return require('window/configs/application')(filetype, '').kind;
  } catch (e) {
    // A lookup failure must never cost the user their link — the caller falls
    // back to the long form on undefined.
    return undefined;
  }
}

/**
 * Rewrite a long desk deep link into the compact form when — and only when —
 * that is provably lossless. Anything else is returned unchanged.
 *
 * @param {String} url absolute or root-relative, as viewerLink() returns it
 * @returns {String} the compact URL, or `url` itself
 */
function toCompactUrl(url) {
  if (typeof url !== 'string') return url;

  const marker = `${_K.module.desk}/wm/${LONG_SEGMENT}/`;
  const at = url.indexOf(marker);
  if (at < 0) return url;

  const query = url.slice(at + marker.length);
  if (!query) return url;

  // Parsed by hand rather than with URLSearchParams: a value that arrived
  // percent-encoded must fail the SAFE_SEGMENT test below and keep the long
  // form, and decoding it first would hide exactly that.
  const params = {};
  for (const pair of query.split('&')) {
    const eq = pair.indexOf('=');
    if (eq < 1) return url;
    params[pair.slice(0, eq)] = pair.slice(eq + 1);
  }

  const { nid, hub_id, filetype, kind } = params;

  // Exactly these four, no more: an unrecognised parameter means this link
  // carries something the compact form has no room for, so keep it long.
  if (Object.keys(params).length !== 4) return url;
  if (!SAFE_SEGMENT.test(nid || '')) return url;
  if (!SAFE_SEGMENT.test(hub_id || '')) return url;
  if (!SAFE_SEGMENT.test(filetype || '')) return url;

  // The whole safety argument for dropping `kind`, checked per link.
  const derived = kindForFiletype(filetype);
  if (!derived || derived !== kind) return url;

  const head = url.slice(0, at);
  return `${head}${_K.module.desk}/wm/${COMPACT_SEGMENT}/${nid}/${hub_id}/${filetype}`;
}

/**
 * Read a compact link back into the payload the long form hands the openers.
 *
 * @param {Array} path output of `Visitor.parseModule()` — ['desk','wm','o',…]
 * @returns {Object|null} `{ nid, hub_id, filetype, kind }`, or null when the
 *   path is not a well-formed compact link. Callers must treat null as "not
 *   mine" and fall through to the resolution they would have used anyway.
 */
function parseCompactPath(path) {
  if (!Array.isArray(path)) return null;
  if (path.length !== 6) return null;
  if (path[2] !== COMPACT_SEGMENT) return null;

  const [nid, hub_id, filetype] = path.slice(3);
  if (!SAFE_SEGMENT.test(nid || '')) return null;
  if (!SAFE_SEGMENT.test(hub_id || '')) return null;
  if (!SAFE_SEGMENT.test(filetype || '')) return null;

  const kind = kindForFiletype(filetype);
  if (!kind) return null;

  return { nid, hub_id, filetype, kind };
}

module.exports = { COMPACT_SEGMENT, toCompactUrl, parseCompactPath };
