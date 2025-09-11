module.exports = function (env, error, style) {
  const { protocol, main_domain, endpointPath } = bootstrap();
  let html = `
    <div>Ooops !</div> 
    <div>${location.host} could not be found.</div> 
    <a style="${style}" href="${protocol}://${main_domain}${endpointPath}/#/welcome">${LOCALE.GOTO_HOMEPAGE}</a>
  `;
  return html;
};