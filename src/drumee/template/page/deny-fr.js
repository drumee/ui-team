module.exports = function (env, error, style) {
  const { protocol, main_domain, endpointPath } = bootstrap();
  let html = `
    <div>Oups&nbsp;!</div> 
    <div>Vous n'êtes pas autorisé à accéder à ce site.</div> 
    <div>Cela est dû à sa configuration qui accorde l'accès uniquement aux membres autorisés.</div> 
    <a style="${style}" href="${protocol}://${main_domain}${endpointPath}/#/welcome">${LOCALE.GOTO_HOMEPAGE}</a>
  `;
  return html;
};