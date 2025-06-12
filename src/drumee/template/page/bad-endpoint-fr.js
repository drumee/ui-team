module.exports   = function(env, error, style){
  let html = `
    <div>Oups&nbsp;!</div> 
    <div>Impossible de trouver les données appropriées depuis le point de terminaison ${env.serviceUrl}.</div> 
    <a style="${style}" href=`${protocol}://${env.main_domain}/#/welcome`>${LOCALE.GOTO_HOMEPAGE}</a>
  `;
  return html;
};
