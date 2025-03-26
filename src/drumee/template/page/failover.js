module.exports   = function(env, error, style){
  let html = `
    <div>Ooops !</div> 
    <div>The runtime environment has crashed</div> 
    <div>This should not happen... but it does :'(</div> 
    <a ${style} href=\"https://${env.main_domain}${location.pathname}\">go to the main page</a>
  `;
  return html;
};