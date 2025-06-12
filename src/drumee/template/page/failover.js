module.exports   = function(env, error, style){
  let html = `
    <div>Ooops !</div> 
    <div>The runtime environment has crashed</div> 
    <div>This should not happen... but it does :'(</div> 
    <a style="${style}" href=`${protocol}://${env.main_domain}/#/welcome`>${LOCALE.GOTO_HOMEPAGE}</a>
  `;
  return html;
};