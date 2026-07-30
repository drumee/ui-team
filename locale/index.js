const { createSafeObject } = require("@drumee/ui-essentials");

// This bundle owns the string table, so it owns the language the document
// declares. Runs at bundle-execution time, before the load event — see
// ./declare-lang.
require('./declare-lang')('en');

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
window.Dayjs = dayjs;
window.createSafeObject = createSafeObject;

document.addEventListener('readystatechange', () => {
  if (document.readyState == 'complete') {
    console.log(`Loading Locale...`, document.readyState);
    window.LOCALE = createSafeObject(require('./en.json'));
    window._a = createSafeObject(require('lex/attribute'));
    window._e = createSafeObject(require('lex/event'));
    const event = new Event('drumee:bootstraping');
    event.name = 'locale'
    document.dispatchEvent(event);
  }
}, false);