/**
 * Pick a failover page in the UI language.
 *
 * These templates are the one intentional raw-HTML path in the app
 * (framework-invariants §4/§5): they render through `innerHTML` from
 * `drumee.js` failover(), in a path that can run before the string table
 * exists, so their copy stays as literals rather than moving to `LOCALE.*`.
 * That rule is about not converting the literals — not about being stuck in
 * one language. French counterparts have existed next to every English page
 * for as long as the English ones have; nothing ever required them, so a
 * French session hit a crash and got an English page. This is the dispatch
 * they were written for.
 *
 * Requires are static and explicit because webpack has to see every branch,
 * and because the fallback must be a real module rather than a dynamic path
 * that can resolve to nothing at the exact moment everything else has
 * already failed.
 *
 * Language comes from locale/supported, which reads localStorage — NOT from
 * `window.UI_LANGUAGE`, which the locale bundle may not have set yet in the
 * earliest failure path, and never from the served `<html lang>`, which
 * leans French upstream. Unknown/absent choice resolves to English.
 */

const supported = require('locale/supported');

const PAGES = {
  '403': { en: require('./403'), fr: require('./403-fr') },
  '404': { en: require('./404'), fr: require('./404-fr') },
  '500': { en: require('./500'), fr: require('./500-fr') },
  error: { en: require('./error'), fr: require('./error-fr') },
  failover: { en: require('./failover'), fr: require('./failover-fr') },
};

/**
 * @param {string} name page key — '403', '404', '500', 'error', 'failover'
 * @returns {Function} renderer `(env, error, style) => html`
 */
module.exports = function page(name) {
  const variants = PAGES[name] || PAGES.failover;
  let lang = supported.DEFAULT_LANGUAGE;
  try {
    lang = supported.current();
  } catch (e) {
    /* storage unreachable mid-crash — English, like any unknown choice */
  }
  return variants[lang] || variants[supported.DEFAULT_LANGUAGE];
};
