module.exports   = function(l){
  if(/^en.*$/.test(l)) return {...require('./web/en.json'), ...require('./en.json')};
  if(/^es.*$/.test(l)) return {...require('./web/es.json'), ...require('./es.json')};
  if(/^fr.*$/.test(l)) return {...require('./web/fr.json'), ...require('./fr.json')};
  if(/^km.*$/.test(l)) return {...require('./web/km.json'), ...require('./km.json')};
  if(/^ru.*$/.test(l)) return {...require('./web/ru.json'), ...require('./ru.json')};
  if(/^zh.*$/.test(l)) return {...require('./web/zh.json'), ...require('./zh.json')};
  return require('./en.json')
}