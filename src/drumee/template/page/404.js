module.exports   = function(env, error, style){
  let html = `
    <div>Ooops... ${LOCALE.SITE_NOT_FOUND.format(location.host)}</div> 
    <a ${style} href=\"https://${env.main_domain}${location.pathname}/#/welcome\">${LOCALE.CLICK_N_GOTO_HYPERDESK}</a>
  `;
  return html;
};
