/**
 * Link cards for Drumee links in chat (Lexis 2026-11-04): a link with no
 * preview "looks like a scam link". Two places use this:
 *   - the sent message (widget/chat-item): a card under the text;
 *   - the composer (widget/chat): a card floating above the input while a
 *     Drumee link sits in it.
 * Outside apps (Telegram, Zalo, Slack…) get the same facts as Open Graph tags
 * from the page server (server-team service/lib/link-preview.js).
 *
 * What a card may show — the reader of a chat may have NO access to the link:
 *   - Internal link (#/desk/wm/o/… or #/desk/wm/open/…): neutral card, styled
 *     after the workspace-invite email ("Access Restricted"). Built from the
 *     URL alone — no request, so nothing about the file can leak.
 *   - External link (Secure share, /s/<token> or #/dmz/share/<token>): asks
 *     `link_preview.share` (anonymous). Public → file name + sender. Secure
 *     (email / password) → neutral card in a different tone, no name.
 *     Revoked / expired → "Link unavailable".
 * Anything else is not ours and gets no card.
 *
 * Pure helpers (no DOM, no globals) so they can be tested in node. Markup:
 * widget/chat-item/template/link-card.js (sent message, legacy template
 * path) and widget/chat/skeleton/link-card.js (composer, Skeletons).
 */

/** Same url-safe set the server accepts for a token (link-preview.js). */
const TOKEN_RE = /^[A-Za-z0-9_-]{8,80}$/;
const SAFE_SEGMENT = /^[A-Za-z0-9._-]+$/;

const KIND = { internal: "internal", share: "share" };
const TONE = {
  internal: "internal",
  public: "public",
  secure: "secure",
  unavailable: "unavailable",
  loading: "loading",
};

/**
 * Is `host` this deployment's domain or one of its subdomains?
 * (share.<domain>, a workspace vhost, the apex.)
 * @param {string} host
 * @param {string} mainDomain
 * @returns {boolean}
 */
function isOwnHost(host, mainDomain) {
  const h = String(host || "").toLowerCase();
  const md = String(mainDomain || "").toLowerCase();
  if (!h || !md) return false;
  return h === md || h.endsWith(`.${md}`);
}

/**
 * Recognise a Drumee link.
 * @param {string} href
 * @param {{mainDomain:string, currentHost?:string}} env
 * @returns {null|{kind:'internal', filetype:string, url:string}|{kind:'share', token:string, url:string}}
 */
function parseDrumeeLink(href, env = {}) {
  let url;
  try {
    url = new URL(String(href || ""));
  } catch (e) {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const own =
    isOwnHost(url.hostname, env.mainDomain) ||
    (!!env.currentHost && url.host.toLowerCase() === String(env.currentHost).toLowerCase());
  if (!own) return null;
  // Every Drumee app path lives under /-/ (/-/, /-/preview/, /-/<dev>/).
  if (!/^\/-(\/|$)/.test(url.pathname)) return null;

  // Short External link: /-/[<endpoint>/]s/<token>
  const short = url.pathname.match(/^\/-\/(?:[A-Za-z0-9_-]+\/)?s\/([^/]+)\/?$/);
  if (short && !url.hash) {
    return TOKEN_RE.test(short[1]) ? { kind: KIND.share, token: short[1], url: url.href } : null;
  }

  const hash = url.hash.replace(/^#\/?/, "");
  if (!hash) return null;

  // Historic External link: #/dmz/share/<token>
  let m = hash.match(/^dmz\/share\/([^/?&#]+)\/?$/);
  if (m) {
    return TOKEN_RE.test(m[1]) ? { kind: KIND.share, token: m[1], url: url.href } : null;
  }

  // Internal link, compact: #/desk/wm/o/<nid>/<hub_id>/<filetype>
  m = hash.match(/^desk\/wm\/o\/([^/]+)\/([^/]+)\/([^/]+)\/?$/);
  if (m) {
    if (![m[1], m[2], m[3]].every((s) => SAFE_SEGMENT.test(s))) return null;
    return { kind: KIND.internal, filetype: m[3], url: url.href };
  }

  // Internal link, long: #/desk/wm/open/nid=…&hub_id=…&filetype=…
  m = hash.match(/^desk\/wm\/open\/(.+)$/);
  if (m) {
    const q = new URLSearchParams(m[1]);
    if (!q.get("nid") || !q.get("hub_id")) return null;
    const filetype = q.get("filetype") || "";
    return {
      kind: KIND.internal,
      filetype: SAFE_SEGMENT.test(filetype) ? filetype : "",
      url: url.href,
    };
  }
  return null;
}

/**
 * First Drumee link in a piece of text (the composer).
 * @param {string} text
 * @param {Object} env see parseDrumeeLink
 * @returns {Object|null}
 */
function firstDrumeeLink(text, env) {
  const found = String(text || "").match(/https?:\/\/[^\s<>"'()]+/g) || [];
  for (const raw of found) {
    const link = parseDrumeeLink(raw.replace(/[.,;:!?]+$/, ""), env);
    if (link) return link;
  }
  return null;
}

/**
 * @param {*} v
 * @returns {string}
 */
function esc(v) {
  return String(v == null ? "" : v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * `{0}` substitution, without relying on String.prototype.format.
 * @param {string} tpl
 * @param {string} value
 * @returns {string}
 */
function fill(tpl, value) {
  return String(tpl || "").replace("{0}", value);
}

const FOLDER_TYPES = /^(folder|root|hub)$/;

/** Sprite icons (icons/src/normalized) used by the cards. */
const ICON = {
  lock: "apps-lock-simple",
  file: "app-file",
  folder: "app-folder",
  link: "apps-link-simple",
  close: "cross",
};

/**
 * A public folder's first entry names after the sender line — the same names
 * the share page shows anyone holding the link.
 * @param {string} by
 * @param {Object} facts
 * @returns {string}
 */
function publicDesc(by, facts) {
  const items = Array.isArray(facts.items)
    ? facts.items.filter((n) => typeof n === "string" && n).slice(0, 3)
    : [];
  if (!items.length) return by;
  const list = `${items.join(", ")}${facts.more ? ", …" : ""}`;
  return by ? `${by} · ${list}` : list;
}

/**
 * Text + tone for a card.
 * @param {Object} link   parseDrumeeLink() result
 * @param {Object|null} facts  link_preview.share answer; null → still loading
 * @param {Object} L      LOCALE
 * @returns {{tone:string, label:string, title:string, desc:string, icon:string, badge:string}}
 */
function cardModel(link, facts, L = {}) {
  if (link.kind === KIND.internal) {
    return {
      tone: TONE.internal,
      label: L.LINK_CARD_INTERNAL || "Internal link",
      title: L.LINK_CARD_INTERNAL_TITLE || "Shared inside a Drumee workspace",
      desc: L.LINK_CARD_INTERNAL_DESC || "Only members of this workspace can open it.",
      icon: ICON.lock,
      badge: L.LINK_CARD_ACCESS_RESTRICTED || "Access Restricted",
    };
  }
  const label = L.LINK_CARD_EXTERNAL || "External link";
  if (!facts) {
    return { tone: TONE.loading, label, title: L.LINK_CARD_LOADING || "Loading preview…", desc: "", icon: ICON.link, badge: "" };
  }
  if (facts.state === "public") {
    const folder = FOLDER_TYPES.test(facts.filetype || "");
    const by = folder ? L.LINK_CARD_FOLDER_BY || "Folder shared by {0}" : L.LINK_CARD_FILE_BY || "File shared by {0}";
    return {
      tone: TONE.public,
      label,
      title: facts.filename || L.LINK_CARD_SHARED_FILE || "Shared file",
      desc: publicDesc(facts.sender ? fill(by, facts.sender) : "", facts),
      icon: folder ? ICON.folder : ICON.file,
      badge: "",
    };
  }
  if (facts.state === "secure") {
    return {
      tone: TONE.secure,
      label,
      title: L.LINK_CARD_SECURE_TITLE || "Secure link",
      desc: L.LINK_CARD_SECURE_DESC || "Protected file. Verification is required to open it.",
      icon: ICON.lock,
      badge: L.LINK_CARD_ACCESS_RESTRICTED || "Access Restricted",
    };
  }
  return {
    tone: TONE.unavailable,
    label,
    title: L.LINK_CARD_UNAVAILABLE_TITLE || "Link unavailable",
    desc: L.LINK_CARD_UNAVAILABLE_DESC || "This shared link has expired or is no longer available.",
    icon: ICON.link,
    badge: "",
  };
}

/**
 * One request per token, shared by every card that shows it; answers are
 * kept a minute so a long chat does not re-ask for each repeated link.
 * @param {Map} cache
 * @param {string} token
 * @param {function(string):Promise<Object>} ask
 * @param {number} [now]
 * @returns {Promise<Object>}
 */
function cachedFacts(cache, token, ask, now = Date.now()) {
  const hit = cache.get(token);
  if (hit && now - hit.at < 60000) return hit.promise;
  const promise = Promise.resolve()
    .then(() => ask(token))
    .then((res) => {
      const r = Array.isArray(res) ? res[0] : res;
      return r && r.state ? r : { state: "unavailable" };
    })
    .catch(() => {
      cache.delete(token); // a network hiccup must not stick for a minute
      return null;
    });
  cache.set(token, { at: now, promise });
  return promise;
}

/** One cache for every chat on the page (composer + sent messages). */
const FACTS = new Map();

module.exports = {
  FACTS,
  KIND,
  TONE,
  ICON,
  isOwnHost,
  parseDrumeeLink,
  firstDrumeeLink,
  cardModel,
  cachedFacts,
  esc,
};
