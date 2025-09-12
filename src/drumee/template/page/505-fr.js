module.exports   = function(env, error, style){
    const { endpoint } = bootstrap();
  let html = `
    <div>Oups&nbsp;!</div> 
    <div>Un problème est survenu sur nos serveurs.</div> 
    <div>Veuillez réessayer plus tard</div> 
    <a ${style} href="${endpoint}/#/welcome">Recharger</a>
  `;
  return html;
};
