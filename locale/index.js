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

/**
 * 
 */
$(document).ready(function () {
  console.log(`Loading Locale...`);
  require('./en.json')
   window.LOCALE = createSafeObject(require('./en.json'));
});
