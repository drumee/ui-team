module.exports   = function(env, error, style){
  let html = `
    <div>Oups&nbsp;!</div> 
    <div>Vous n'êtes pas autorisé à accéder à ce site.</div> 
    <div>Cela est dû à sa configuration qui accorde l'accès uniquement aux membres autorisés.</div> 
    <a style="${style}" href="https://${env.main_domain}/#/welcome">${LOCALE.GOTO_HOMEPAGE}</a>

    `;
  return html;
};
