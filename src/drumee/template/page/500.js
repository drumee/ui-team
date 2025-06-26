module.exports   = function(env, error, style){
  let html = `
    <div>Ooops !</div> 
    <div>Something wrong happen to the servers.</div> 
    <div>Please try again later</div> 
    <a style="${style}" href="${protocol}://${env.main_domain}/#/welcome">${LOCALE.GOTO_HOMEPAGE}</a>
  `;
  return html;
};