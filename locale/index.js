window.WARNING = require('lex/warning');
window.ERROR = require('lex/error');
window._a = require('lex/attribute');
window._K = require('lex/constants');
window._T = require('lex/template');
window.KIND = require('lex/type/reader');
window._e = require('lex/event');

const { createSafeObject } = require("core/utils");
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
    const event = new Event('drumee:bootstraping');
    event.name = 'locale'
    document.dispatchEvent(event);
  }
}, false);