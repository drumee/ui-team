/**
 * Align the document's declared language — and the language-bearing strings
 * in its <head> — with the LOCALE table the UI actually renders.
 *
 * The shell's `<html lang>`, `<meta http-equiv="Content-Language">`,
 * `<title>`, `<meta name="description">` and `keywords` are ALL
 * server-rendered from the signed-in user's `profile.lang` (server-team
 * `client/page.js` -> `pageLanguage()` + `DrumeeCache.lex(lang)`). The client
 * is the authority on the UI language — the switcher writes localStorage
 * before it POSTs `drumate.set_lang`, the POST can fail, and the page render
 * reads the SESSION's copy of the profile, which can still hold the previous
 * value right after a successful write. So the served head can disagree with
 * the table we are about to install.
 *
 * Only `lang` used to be corrected. That left a French `<title>` and meta
 * description on an English page, which is both visible (the browser tab) and
 * exactly what Chrome's language detector reads — hence "Translate this page
 * from French?" on a page whose UI is English.
 *
 * The head strings are replaced ONLY when the served language disagrees with
 * the installed one. When they agree, the server's copy is left alone: it is
 * the SEO text for public and share pages and there is no reason to overwrite
 * it with our generic version.
 *
 * Call this at bundle-execution time, not from a load/readystatechange
 * handler: the app bundles are `async` scripts, so they run before the load
 * event and land ahead of the browser's language detection.
 *
 * @param {string} lang language of the LOCALE table in use
 * @returns {string} the language that was declared
 */

// The language the SERVER rendered this document in, sampled once when this
// module is first required — which is at locale/index.js module execution,
// before anything here has written to the document. Every later call compares
// against this, not against `documentElement.lang`, which by then is ours.
const SERVED = (function () {
  try {
    return String(document.documentElement.lang || '').toLowerCase().split(/[-_.]/)[0];
  } catch (e) {
    return '';
  }
})();

/**
 * Replace one <meta> element's content, if the page carries it.
 *
 * @param {string} selector CSS selector for the meta element
 * @param {string} content  replacement value
 */
function setMeta(selector, content) {
  try {
    const el = document.querySelector(selector);
    if (el && content) el.setAttribute('content', content);
  } catch (e) {
    /* no document, or no such meta — nothing to correct */
  }
}

module.exports = function declareUiLanguage(lang = 'en') {
  try {
    document.documentElement.lang = lang;
    const meta = document.querySelector('meta[http-equiv="content-language" i]');
    if (meta) meta.setAttribute('content', `${lang},en`);

    // Nothing to do when the server already rendered this language, nor when
    // the document declared none at all — an absent `lang` is no evidence the
    // head is in the wrong language, and overwriting a public page's SEO text
    // on a guess is worse than leaving it. Also nothing to do before LOCALE
    // exists (the first call, at bundle exec, runs ahead of it; install()
    // calls again once the table is in).
    if (!SERVED || SERVED === lang) return lang;
    const L = typeof window !== 'undefined' && window.LOCALE;
    if (!L) return lang;

    // Keep the unread-count prefix the activity panel maintains
    // (panel/activity/index.js updateactivityTitle) — it owns "(3) " and
    // re-applies it against whatever title is present.
    const title = L.PAGE_TITLE;
    if (title && title !== 'PAGE_TITLE') {
      const count = (String(document.title).match(/^\(\d+\)\s*/) || [''])[0];
      document.title = `${count}${title}`;
    }
    // The description is what the detector actually weighs besides the body
    // text. `keywords` is deliberately left as served: it carries no weight,
    // we have no localized replacement for it, and blanking it would be a
    // change to the page's SEO for no gain.
    const desc = L.PAGE_DESCRIPTION;
    if (desc && desc !== 'PAGE_DESCRIPTION') setMeta('meta[name="description" i]', desc);
  } catch (e) {
    /* no document (non-browser host) — nothing to declare */
  }
  return lang;
};
