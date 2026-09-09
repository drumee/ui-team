/**
 * The string tables, plus the language contract from ./supported.
 *
 * Require THIS only from a bundle that installs a table (the locale entry
 * bundle, the embed loader). UI code that just needs to know which language
 * is active must require ./supported instead, and code that needs to *swap*
 * the table calls the `window.setUiLanguage` that `install` publishes — the
 * tables below are statically required, and `locale/` is its own webpack
 * entry, so requiring this module from `main` would duplicate ~380 KB of
 * JSON into that chunk.
 *
 * Three separate bundles used to answer "which string table?" by hardcoding
 * `en` (`locale/index.js`, `src/drumee/api/loader.js`) while a fourth
 * (`window/account/preferences`) wrote a language into localStorage, POSTed
 * `drumate.set_lang` and restarted the router — so the choice was persisted
 * on both sides and then never read back. Switching the language did nothing
 * visible. This module is what the table selection actually reads.
 */

const { createSafeObject } = require('@drumee/ui-essentials');
const supported = require('./supported');
const declareUiLanguage = require('./declare-lang');
const dayjs = require('dayjs');

// Locale DATA, not just the plugins locale/index.js extends. dayjs ships
// only English built in, and `.locale('fr')` on an unregistered locale falls
// back to English SILENTLY — so every
// `Dayjs.unix(t).locale(Visitor.language()).format('DD MMMM')` and every
// relativeTime string ("2 hours ago") rendered English whatever the UI
// language, which in a French UI is exactly the half-translated result this
// work exists to remove. Requiring the file registers it; install() then
// picks the global default for the format calls that pass no locale.
require('dayjs/locale/fr');

// Statically required, not dynamic — webpack must see every table to bundle
// it, and a language switch must not depend on a network round trip
// succeeding after the reload.
const TABLES = {
  en: require('./en.json'),
  fr: require('./fr.json'),
};

/**
 * The string table for a language, falling back to English.
 *
 * @param {string} l language code
 * @returns {Object} raw key map — wrap it in `createSafeObject` before use
 */
function table(l) {
  return TABLES[supported.normalize(l)] || TABLES[supported.DEFAULT_LANGUAGE];
}

/**
 * Install a language: the live `LOCALE` table, the code every later reader
 * resolves against, and the language the document declares.
 *
 * Replacing the `window.LOCALE` object is enough for everything rendered
 * *after* the call, because skeletons read `LOCALE.KEY` at render time and
 * never capture the table. It does NOT retranslate what is already mounted —
 * a mid-session switch has to reload (see `set-ui-language` in the desk
 * module); this is for the boot path, where nothing has rendered yet.
 *
 * Publishing itself as `window.setUiLanguage` is what lets `main` swap the
 * table without importing it: only the bundle that owns the tables can hand
 * one out, and only one bundle should own them.
 *
 * @param {string} l language to install
 * @returns {string} the normalized language that was installed
 */
function install(l) {
  const n = supported.normalize(l);
  window.LOCALE = createSafeObject(table(n));
  window.UI_LANGUAGE = n;
  window.setUiLanguage = install;
  dayjs.locale(n);
  // Pin the ui-core keys to whatever we just installed, on EVERY arch and
  // for anonymous visitors too. Without this, `Visitor.language()` can still
  // answer 'fr' off older builds' navigator-derived residue (or off the
  // server's French-defaulting user.lang) while the table here is English —
  // French dates in an English UI. It records no choice; only the switcher
  // and the boot reconciliation do that.
  supported.pin(n);
  declareUiLanguage(n);
  return n;
}

module.exports = Object.assign({}, supported, { table, install });
