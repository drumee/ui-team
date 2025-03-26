module.exports   = function(env, error, style){
  let html = `
    <div>Ooops !</div> 
    <div>You are not allow to acces this site.</div> 
    <div>This due to its settings which grants accees to only authorized members</div> 
    <a ${style} href=\"https://${env.main_domain}${location.pathname}/#/welcome\">${LOCALE.CLICK_N_GOTO_HYPERDESK}</a>
  `;
  return html;
};