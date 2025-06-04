module.exports   = function(){
  let html = `
    <div>Oups&nbsp;!</div> 
    <div>Vous n'êtes pas autorisé à accéder à ce site.</div> 
    <div>Cela est dû à sa configuration qui accorde l'accès uniquement aux membres autorisés.</div> 
    <a ${style}
    href=\"https://drumee.com${location.pathname}/#/desk\">aller à votre bureau</a>
  `;
  return html;
};