module.exports   = function(env, error, style){
  let html = `
    <div>Ooops !</div> 
    <div>Could not find proper data from the end point ${env.serviceUrl}.</div> 
    <a style="${style}" href="${protocol}://${env.main_domain}/#/welcome">${LOCALE.GOTO_HOMEPAGE}</a>
  `;
  return html;
};