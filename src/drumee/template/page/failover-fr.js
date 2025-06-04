module.exports   = function(env, error, style){
  let html = `
    <div>Oups&nbsp;!</div> 
    <div>L'environnement d'exécution a planté</div> 
    <div>Cela ne devrait pas arriver... mais c'est quand même arrivé :'(</div> 
    <a style="${style}" href="https://${env.main_domain}/#/welcome">${LOCALE.GOTO_HOMEPAGE}</a>
  `;
  return html;
};