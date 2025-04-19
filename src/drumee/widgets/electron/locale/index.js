module.exports   = function(l){
  if(/^en.*$/.test(l)) return require('./en.json');
  if(/^fr.*$/.test(l)) return require('./fr.json');
  if(/^km.*$/.test(l)) return require('./km.json');
  if(/^ru.*$/.test(l)) return require('./ru.json');
  if(/^zh.*$/.test(l)) return require('./zh.json');
  return require('./en.json')
}