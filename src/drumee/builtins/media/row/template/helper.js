
module.exports = function (m) {
  const preview = require('./preview')(m);
  const filename = require('./filename')(m);
  const type = m.filetype;
  const {
    area
  } = m;
  const html = `
  <div class="${m.fig.family} ${m.fig.family}__ui ${type} moving ${area}"> 
    <div class="${m.fig.family}__container box" > 
      <div class="${m.fig.family}__main">${preview} ${filename}</div> 
    </div> 
  </div>
`;
  return $(html);
};
