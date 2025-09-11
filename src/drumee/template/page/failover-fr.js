module.exports = function (env, error, style) {
  const { protocol, main_domain, endpointPath } = bootstrap();
  let html = `
    <div>Oups&nbsp;!</div> 
    <div>L'environnement d'exécution a planté</div> 
    <div>Cela ne devrait pas arriver... mais c'est quand même arrivé :'(</div> 
    <a style="${style}" href="${protocol}://${main_domain}${endpointPath}/#/welcome">${LOCALE.GOTO_HOMEPAGE}</a>
  `;
  return html;
};