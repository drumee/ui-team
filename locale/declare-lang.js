/**
 * Align the document's declared language with the LOCALE table the UI actually
 * renders.
 *
 * The shell's `<html lang>` / `<meta http-equiv="Content-Language">` are
 * server-rendered from the account+hub language (server-team
 * `client/templates/index.tpl`), and that value still defaults to French
 * upstream — `yellow_page.entity.default_lang` is `NOT NULL DEFAULT 'fr'`, and
 * the `input.language()` fallback in @drumee/server-core resolves to `'fr'`
 * when Accept-Language yields nothing. The bundle, meanwhile, ships one
 * English string table (`locale/index.js`, `api/loader.js` both load
 * `en.json`). An uncorrected `fr` declaration therefore describes a page whose
 * text is English, and the browser offers to translate it from French on every
 * single load.
 *
 * Declaring what we render kills that mismatch at the source. Call this at
 * bundle-execution time, not from a load/readystatechange handler: the app
 * bundles are `async` scripts, so they run before the load event and land
 * ahead of the browser's language detection.
 *
 * @param {string} lang language of the LOCALE table in use
 * @returns {string} the language that was declared
 */
module.exports = function declareUiLanguage(lang = 'en') {
  try {
    document.documentElement.lang = lang;
    const meta = document.querySelector('meta[http-equiv="content-language" i]');
    if (meta) meta.setAttribute('content', `${lang},en`);
  } catch (e) {
    /* no document (non-browser host) — nothing to declare */
  }
  return lang;
};
