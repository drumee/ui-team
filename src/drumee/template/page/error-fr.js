module.exports   = function(style){
  let html = `
    <div>Oups&nbsp;!</div> 
    <div>${location.host} est introuvable.</div> 
    <a ${style} 
    href=\"https://drumee.com/#/desk\">aller à votre bureau</a>
  `;
  return html;
};