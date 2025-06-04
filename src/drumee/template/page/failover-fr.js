module.exports   = function(env, error, style){
  let html = `
    <div>Oups&nbsp;!</div> 
    <div>L'environnement d'exécution a planté</div> 
    <div>Cela ne devrait pas arriver... mais c'est le cas :'(</div> 
    <a ${style} href=\"https://${env.main_domain}${location.pathname}\">aller à la page principale</a>
  `;
  return html;
};