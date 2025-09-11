module.exports   = function(env, error, style){
    const { protocol, main_domain, endpointPath } = bootstrap();
  let html = `
    <div>Oups&nbsp;!</div> 
    <div>Un problème est survenu sur nos serveurs.</div> 
    <div>Veuillez réessayer plus tard</div> 
    <a ${style} href="${protocol}://${main_domain}${endpointPath}/#/welcome">Recharger</a>
  `;
  return html;
};
