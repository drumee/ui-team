module.exports   = function(env, error, style){
  let html = `
    <div>Oups&nbsp;!</div> 
    <div>Vous n'êtes pas autorisé à accéder à ce site.</div> 
    <div>Cela est dû à sa configuration qui accorde l'accès uniquement aux membres autorisés.</div> 
    <a ${style} href=\"https://${env.main_domain}${location.pathname}/#/welcome\">${LOCALE.CLICK_N_GOTO_HYPERDESK}</a>
  `;
  return html;
};
