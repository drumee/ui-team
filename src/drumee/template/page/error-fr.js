module.exports = function (env, error, style) {
  const { endpoint } = bootstrap();
  let html = `
    <div>Oups&nbsp;!</div> 
    <div>${location.host} est introuvable.</div> 
    <a style="${style}" href="${endpoint}/#/welcome">${LOCALE.GOTO_HOMEPAGE}</a>
  `;
  return html;
};