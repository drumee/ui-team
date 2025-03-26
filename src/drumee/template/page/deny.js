module.exports   = function(){
  let html = `
    <div>Ooops !</div> 
    <div>You are not allow to acces this site.</div> 
    <div>This due to its settings which grants accees to only authorized members</div> 
    <a ${style}
    href=\"https://drumee.com${location.pathname}/#/desk\">go to your own desk</a>
  `;
  return html;
};