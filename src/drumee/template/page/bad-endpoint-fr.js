module.exports = function (env, error, style) {
  const { endpoint } = bootstrap();
  let html = `
    <div>Oups&nbsp;!</div> 
    <div>Impossible de trouver les données appropriées depuis le point de terminaison ${env.serviceUrl}.</div> 
    <a style="${style}" href="${endpoint}/#/welcome">${LOCALE.GOTO_HOMEPAGE}</a>
  `;
  return html;
};
