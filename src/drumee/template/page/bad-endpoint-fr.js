module.exports   = function(){
  let html = `
    <div>Oups&nbsp;!</div> 
    <div>Impossible de trouver les données appropriées depuis le point de terminaison ${bootstrap().serviceUrl}.</div> 
    <a \
    style=\"width: 475px; height: 354px; font-size:20px; color:red; margin:auto;\" 
    href=\"https://drumee.com/#/desk\">aller à votre bureau</a>
  `;
  return html;
};
