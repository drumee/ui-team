module.exports   = function(env, error, style){
  let html = `
    <div>Ooops !</div> 
    <div>Something wrong happen to our servers.</div> 
    <div>Please try again later</div> 
    <a ${style} href="${protocol}://${env.main_domain}${location.pathname}/#/welcome">Reload</a>
  `;
  return html;
};