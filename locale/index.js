const { createSafeObject } = require("@drumee/ui-essentials");
const lang = require('./lang');

// This bundle owns the string table, so it owns the language the document
// declares. Runs at bundle-execution time, before the load event — see
// ./declare-lang. The language is the explicit in-app choice (./supported),
// never the served <html lang>: that one still leans French upstream, and
// English is the product default.
const UI_LANGUAGE = lang.current();
require('./declare-lang')(UI_LANGUAGE);

window.WARNING = require('lex/warning');
window.ERROR = require('lex/error');
window._K = require('lex/constants');
// window._T = require('lex/template');
// window.KIND = require('lex/type/reader');

const relativeTime = require('dayjs/plugin/relativeTime');
const duration = require('dayjs/plugin/duration')
const dayjs = require('dayjs');
dayjs.extend(relativeTime);
dayjs.extend(duration);
// The locale DATA and the global default are ./lang's job (install), so a
// later swap moves the dates too — see the note there.
window.Dayjs = dayjs;
window.createSafeObject = createSafeObject;

document.addEventListener('readystatechange', () => {
  if (document.readyState == 'complete') {
    console.log(`Loading Locale...`, document.readyState, UI_LANGUAGE);
    // Sets window.LOCALE / window.UI_LANGUAGE and publishes
    // window.setUiLanguage, which is how `main` swaps the table without
    // pulling every string table into its own chunk.
    lang.install(UI_LANGUAGE);
    window._a = createSafeObject(require('lex/attribute'));
    window._e = createSafeObject(require('lex/event'));
    const event = new Event('drumee:bootstraping');
    event.name = 'locale'
    document.dispatchEvent(event);
  }
}, false);
