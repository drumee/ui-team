/**
 * The UI language contract, WITHOUT the string tables.
 *
 * Split out from ./lang deliberately. `lang.js` statically requires every
 * table so webpack bundles them into the locale entry chunk; anything that
 * only needs to know *which* language is active (the account menu, the desk
 * module's switch handler) must not drag ~200 KB of duplicated JSON into the
 * main bundle to find out. Require this from UI code and ./lang only from the
 * bundles that actually install a table.
 *
 * Two hard rules encoded here:
 *
 * 1. **English is the default, always.** Never derive the language from
 *    `navigator.language`, from `bootstrap().lang` or from the served
 *    `<html lang>`. All three lean French upstream —
 *    `yellow_page.entity.default_lang` is `NOT NULL DEFAULT 'fr'` and
 *    @drumee/server-core's `input.language()` falls back to `'fr'` when
 *    Accept-Language yields nothing — which is exactly how English sessions
 *    used to flip to French on a French OS. Only an *explicit* in-app choice
 *    (or the signed-in user's stored profile, which can only be written by
 *    that same choice) moves the UI off English.
 *
 * 2. **Only tables we actually ship and maintain are selectable.** `locale/`
 *    still carries es/km/ru/zh files, but they are stale — hundreds of keys
 *    behind `en.json`, which renders as blank text (`createSafeObject`
 *    answers `''` for a missing key), i.e. an unusable UI in a half-English
 *    half-nothing state. Anything outside SUPPORTED normalizes to English.
 *    Add a language here only once its file is at key parity with en.json.
 *
 * `Platform.get('intl')` is deliberately not consulted: the server builds it
 * as `supportedLanguage()` with no argument, which returns the *scalar*
 * `'en'`, so the one consumer that trusted it (`Array.from(...)`) was
 * enumerating the letters "e" and "n".
 */

/** Languages the UI ships a complete string table for. English is first. */
const SUPPORTED = ['en', 'fr'];

/** The product default. Anything unknown resolves here. */
const DEFAULT_LANGUAGE = 'en';

/**
 * The ONE key that records a deliberate choice, written only by the in-app
 * switcher (and by the boot reconciliation, from the server profile).
 *
 * It is deliberately not one of the MIRROR_KEYS. Those three predate this
 * module and older builds wrote `navigator.language` into them, so a French
 * browser could leave `UIlanguage: 'fr'` behind on an account that never
 * asked for French. Reading them as the source of truth would hand those
 * users a French UI on the first load after deploy — a silent flip nobody
 * requested. A key no previous build ever wrote cannot carry that residue:
 * its presence means a human chose, and its absence means English.
 */
const CHOICE_KEY = 'drumee.uilang';

/**
 * Keys kept in step with the resolved language for @drumee/ui-core's benefit
 * — `Visitor.language()` reads `localStorage.lang`, `Visitor.pagelang()`
 * reads `pagelang` then `UIlanguage`, and `pagelang` rides the
 * `x-param-page-language` header on every request. WRITTEN, never read:
 * see CHOICE_KEY for why.
 *
 * They are pinned rather than deleted, because deleting them lets
 * `Visitor.language()` fall through to the user model's server-supplied
 * `lang` — which defaults to French upstream. Now that the dayjs French
 * locale is actually registered, that fallback would render French dates
 * inside an English UI.
 */
const MIRROR_KEYS = ['UIlanguage', 'pagelang', 'lang'];

/**
 * Reduce anything language-shaped to a supported code.
 *
 * Handles the region forms the server and the browser both emit (`fr-FR`,
 * `fr_FR`, `en-GB`) and refuses everything else — a raw value must never
 * reach the LOCALE lookup or the `x-param-page-language` header.
 *
 * @param {*} l candidate language
 * @returns {string} a member of SUPPORTED
 */
function normalize(l) {
  const n = String(l == null ? '' : l).toLowerCase().trim().split(/[-_.]/)[0];
  return SUPPORTED.includes(n) ? n : DEFAULT_LANGUAGE;
}

/**
 * The language explicitly chosen in this browser, or null when none was.
 *
 * Returning null rather than 'en' matters: it lets a caller tell "the user
 * asked for English" apart from "nobody has asked for anything", which is
 * what makes the signed-in profile authoritative on first load without
 * having to overwrite a fresh browser's storage.
 *
 * @returns {string|null} a member of SUPPORTED, or null
 */
function stored() {
  try {
    const v = localStorage.getItem(CHOICE_KEY);
    if (v) {
      const n = String(v).toLowerCase().trim().split(/[-_.]/)[0];
      if (SUPPORTED.includes(n)) return n;
    }
  } catch (e) {
    /* storage unavailable (private mode, embedded host) — no choice on record */
  }
  return null;
}

/**
 * The language the UI must render in right now.
 *
 * Prefers the table actually installed at boot (`window.UI_LANGUAGE`) so a
 * caller can never disagree with what is on screen, and falls back to
 * storage for the pre-boot callers that install it.
 *
 * @returns {string} a member of SUPPORTED
 */
function current() {
  try {
    if (window.UI_LANGUAGE) return normalize(window.UI_LANGUAGE);
  } catch (e) {
    /* no window (non-browser host) — fall through to storage */
  }
  return stored() || DEFAULT_LANGUAGE;
}

/**
 * Point the ui-core keys at a language without recording a choice.
 *
 * @param {string} n a normalized language
 */
function pin(n) {
  try {
    for (const k of MIRROR_KEYS) localStorage.setItem(k, n);
  } catch (e) {
    /* storage unavailable — this page only */
  }
}

/**
 * Record a deliberate choice, and bring the ui-core keys with it.
 *
 * @param {string} l language code
 * @returns {string} the normalized language that was stored
 */
function store(l) {
  const n = normalize(l);
  try {
    localStorage.setItem(CHOICE_KEY, n);
  } catch (e) {
    /* storage unavailable — the choice lives only for this page */
  }
  pin(n);
  return n;
}

/**
 * Drop any recorded choice and return the UI to English.
 *
 * The mirrors are pinned to English rather than removed — see MIRROR_KEYS.
 * This is also what purges `navigator.language` residue from older builds,
 * which is why the boot reconciliation calls it when the signed-in profile
 * carries no language of its own.
 */
function forget() {
  try {
    localStorage.removeItem(CHOICE_KEY);
  } catch (e) {
    /* nothing recorded to drop */
  }
  pin(DEFAULT_LANGUAGE);
  return DEFAULT_LANGUAGE;
}

module.exports = {
  SUPPORTED,
  DEFAULT_LANGUAGE,
  CHOICE_KEY,
  MIRROR_KEYS,
  normalize,
  stored,
  current,
  pin,
  store,
  forget,
};
