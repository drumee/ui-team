module.exports   = function(env, error, style){
  let html = `
    <div>Oups&nbsp;!</div> 
    <div>Un problème est survenu sur nos serveurs.</div> 
    <div>Veuillez réessayer plus tard</div> 
    <a ${style} href=\`${protocol}://${env.main_domain}${location.pathname}/#/welcome\`>Recharger</a>
  `;
  return html;
};
