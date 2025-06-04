module.exports   = function(env, error, style){
  let html = `
    <div>Ooops !</div> 
    <div>${location.host} could not be found.</div> 
    <a style="${style}" href="https://${env.main_domain}/#/welcome">${LOCALE.GOTO_HOMEPAGE}</a>
  `;
  return html;
};