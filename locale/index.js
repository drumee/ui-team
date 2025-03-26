const relativeTime = require('dayjs/plugin/relativeTime');
const duration = require('dayjs/plugin/duration')
const dayjs = require('dayjs');
dayjs.extend(relativeTime);
dayjs.extend(duration);
window.Dayjs = dayjs;
module.exports   = function(l){
  if(/^en.*$/.test(l)) {
    require('dayjs/locale/en');
    dayjs.locale(l);
    return require('./en.json')
  };
  if(/^fr.*$/.test(l)) {
    require('dayjs/locale/fr');
    dayjs.locale(l);
    return require('./fr.json')
  };
  if(/^km.*$/.test(l)) {
    require('dayjs/locale/km');
    dayjs.locale(l);
    return require('./km.json')
  };
  if(/^ru.*$/.test(l)) {
    require('dayjs/locale/ru');
    dayjs.locale(l);
    return require('./ru.json')
  };
  if(/^zh.*$/.test(l)) {
    require('dayjs/locale/zh');
    dayjs.locale(l);
    return require('./zh.json')
  };
  //require('dayjs/locale/en');
  return require('./en.json')
}
