module.exports = function (env, error, style) {
  const { protocol, main_domain, endpointPath } = bootstrap();
  let html = `
    <div>Oups&nbsp;!</div> 
    <div>${location.host} est introuvable.</div> 
    <a style="${style}" href="${protocol}://${main_domain}${endpointPath}/#/welcome">${LOCALE.GOTO_HOMEPAGE}</a>
  `;
  return html;
};